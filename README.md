# ‡ (diesis)

Diesis enhances your browser to show you the hidden connections between your information.

As you browse the internet, you'll be able to see whether other pages you've visited link to the page you're on, whether you've seen links before (even if you haven't traveled them), and you can even query that archive with text to find related content.

It does this by storing a local copy of the pages you browse and extracting their links, and keywords (using an algorithm called tf-idf). No data ever leaves your computer. There is no cloud service, and no subscription, and only local processes can access it.

*Warning: This is an experimental piece of research software presented for transparency, and is incomplete, unsupported, and likely to stop working.*


## Installing

Diesis has two pieces, a browser plugin and a local daemon that stores the data. You'll need both halves to use diesis successfully.

### Browser plugin

The browser plugin is compatible with Chrome and Firefox, but you'll need to compile it yourself. You can do that by checking out the repository and running:

    $ yarn
    $ yarn build

The the result will be an "unpacked" extension in the `./dist` directory, which you can load in Chrome by going to [chrome://extensions](chrome://extensions), and clicking "Load Unpacked" (you may have to toggle on Developer Mode!), then pointing the dialog at the `dist` directory.

### Local daemon

The daemon is a separate component because it can be used without diesis. Check out the code and start the daemon:

    $ git clone https://github.com/inkandswitch/ksp.git
    $ cargo +nightly build
    $ .\target\debug\knowledge-server serve

## Usage

Diesis collects and archives the text and links on webpages you view, and resurfaces that information later at opportune moments. If Diesis has detected a relationship between the page you're looking at and a page you've previously viewed, the extension icon will include a number showing the number of connections it has discovered. Diesis will also surface links you've seen before on other pages (siblinks), and it will also allow you to query your local data for other pages with similar content by submitting selected text (this is particularly useful for jargon and names).

### Backlinks

A backlink is a link to this page from somewhere else you've been. It might be a blog post you read, or another page on the same site. It could also be a link saved in a local note on your computer.

### Siblinks

A sib-link is a link you've seen somewhere before. The view will show you summaries of other pages where you've seen this link before. This is particularly useful for reference links, such as commonly-linked documentation, blog posts, or similar. 

### Simlinks

Simlinks are pages with similar content to your current query.

### Known Bugs

Diesis sometimes conflicts with webpages. If it's causing problems, you can disable diesis by navigating to [chrome://extensions] and toggling the extension to off. This will stop sending and querying your KSP server. The extension will remain off unless reenabled.

### Wishlist

While the research-trails project is over, if you're interested in contributing, there are some features we didn't get to in the GitHub Issues page. Feel free to inquire on any of them and if one of us has time, we'll help you figure out how to pursue it.

## Credits

An Ink & Switch joint. Part of the `research-trails` project, along with xcrpt and ksp.

Software by Irakli Gozalishvili & Peter van Hardenberg

Based on Pushpin Clipper by Peter van Hardenberg
