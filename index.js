let Scraper = require("./scraper")
let ProgressBar = require("progress")
let fs = require("fs")
let Table = require("easy-table")

let argv = require("yargs")
.usage("Usage: $0 --thread <thread> [options]")
.example("$0 --thread 1071840 --out posts.json")
.alias("t", "thread")
.nargs("t", 1)
.describe("t", "ID of the thread to scrape")
.alias("o", "out")
.nargs("o", 1)
.describe("o", "Filename for JSON output")
.help("h")
.alias("h", "help")
.demandOption(["t"])
.argv

let progressBar

let threadScraper = new Scraper(argv.thread)

threadScraper.on("data", (numPages) => {
	progressBar = new ProgressBar("downloading pages :current/:total [:bar] :percent", {
		total: numPages,
		width: 40,
		complete: "=",
		incomplete: " "
	})
})

threadScraper.on("page", () => {
	progressBar.tick()
})

let findWinningPosts = function(posts) {
	let highest = {}

	for (let post of posts) {
		for (let rating of post.ratings) {
			let current = (highest[rating.name] || { amount: 0 }).amount
			if (rating.amount > current) {
				highest[rating.name] = { amount: rating.amount, post: post }
			}
		}
	}

	return highest
}

let createPostURL = function(postId) {
	return `https://facepunch.com/showthread.php?t=${argv.thread}&p=${postId}&viewfull=1#post${postId}`
}

threadScraper.on("complete", (posts) => {
	if (argv.out) {
		fs.writeFile(argv.out, JSON.stringify(posts))
	}

	let winners = findWinningPosts(posts)
	let winnersTable = new Table()
	for (let rating of Object.keys(winners).sort()) {
		winnersTable.cell("Rating", rating)
		winnersTable.cell("Amount", winners[rating].amount)
		winnersTable.cell("Author", winners[rating].post.authorName)
		winnersTable.cell("Post", createPostURL(winners[rating].post.postId))
		winnersTable.newRow()
	}

	console.log(winnersTable.toString())
})

threadScraper.start()
