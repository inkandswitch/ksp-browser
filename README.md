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

The the result will be an "unpacked" extension in the `./dist` directory, which you can load in Chrome by going to [chrome://extensions], and clicking "Load Unpacked", then pointing the dialog at the `dist` directory.

### Local daemon

The daemon is a separate component because it can be used without diesis. Check out the code and start the daemon:

    $ git clone https://github.com/inkandswitch/ksp.git
    $ cargo +nightly build
    $ .\target\debug\knowledge-server serve

## Usage

Diesis adds an x-ray view that shows you three kinds of information.

### Backlinks

A backlink is a link to this page from somewhere else you've been. It might be a blog post you read, or another page on the same site. It could also be a link saved in a local note on your computer.

### Siblinks

A sib-link is looking /across/ your history, and showing you the other pages that link to this destination.

### Simlinks

Simlinks are pages with similar content to your current query.

## Credits

An Ink & Switch joint. Part of the `research-trails` project, along with xcrpt and ksp.

Software by Irakli Gozalishvili & Peter van Hardenberg

Based on Pushpin Clipper by Peter van Hardenberg
