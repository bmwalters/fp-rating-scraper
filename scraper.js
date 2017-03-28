let scrapeIt = require("scrape-it")
let EventEmitter = require("events")

let userIdRegex = /^member\.php\?u=(\d+)&s=.+$/
let paginationStatusRegex = /^Page (\d+) of (\d+)/

let scraperSchema = {
	posts: {
		listItem: ".postcontainer",
		data: {
			authorId: {
				selector: ".username",
				attr: "href",
				convert: (url) => userIdRegex.exec(url)[1]
			},

			authorName: {
				selector: ".username"
			},

			postId: {
				selector: ".postcounter",
				attr: "name",
				convert: (id) => id.substr(4)
			},

			ratings: {
				listItem: ".rating_results span",
				data: {
					name: {
						selector: "img",
						attr: "alt"
					},

					amount: {
						selector: "strong",
						convert: (amount) => Number(amount || 0)
					}
				}
			}
		}
	},

	paginationStatus: {
		selector: "#pagination_top",
		convert: (text) => {
			let matches = paginationStatusRegex.exec(text)
			if (!matches) { return { current: 1, total: 1 } }
			return {
				current: Number(matches[1]),
				total: Number(matches[2])
			}
		}
	}
}

class ThreadScraper extends EventEmitter {
	constructor(threadId) {
		super()

		this.threadId = threadId
	}

	start() {
		let posts = []

		let facepunchURL = "https://facepunch.com"
		let threadURL = `${facepunchURL}/showthread.php?t=${this.threadId}`

		scrapeIt(threadURL, scraperSchema)
		.then((data) => {
			posts = data.posts

			let numPages = data.paginationStatus.total
			let processedPages = 1

			this.emit("data", numPages)
			this.emit("page")

			if (processedPages == numPages) {
				this.emit("complete", posts)
				return
			}

			let pageDownloaded = (pageData) => {
				Array.prototype.push.apply(posts, pageData.posts)

				processedPages += 1
				this.emit("page")

				if (processedPages == numPages) {
					this.emit("complete", posts)
				}

			}

			for (let page = 2; page <= numPages; page++) {
				scrapeIt(`${threadURL}&page=${page}`, scraperSchema)
				.then(pageDownloaded)
			}
		})
	}
}

module.exports = ThreadScraper
