# Hashprobe Lab

A browser lab for checking SHA-256 results. Run examples with intentional bugs, inspect differing bits, or open reports from [Hashprobe](https://github.com/ArcX-Research/hashprobe).

## Run locally

Use Node.js 24 or newer. The Makefile also finds an existing Homebrew Node 24 installation without changing your shell.

```sh
make install
```

```sh
make dev
```

Open [localhost:5173](http://localhost:5173). Stop the server with Ctrl+C. If the port is busy, use `make dev PORT=5180`.

## Use the lab

- Choose a demo and run its 117 tests. Select a tile to inspect the input and hash difference.
- Try the correct version to compare results after removing the intentional bug.
- Open a Hashprobe JSON report, or drop two reports with the earlier run first to compare them.
- Expand **Full hashes** or **About this demo** for details.

Reports stay in the browser. The viewer accepts Hashprobe’s version 1 SHA-256 report format, up to 40 MiB and 1,024 test results. It displays saved results without rerunning the program. Comparisons match the test ID, input length, and expected hash.

The demos compare Hashprobe’s C reference, compiled to WebAssembly, with browser SHA-256. Each intentional bug changes the browser calculation’s input or output. The animation plays after calculation and does not measure speed. Use Hashprobe’s command-line tool or MCP server to test your own program.

## Check and build

```sh
make test
```

Tests compare 2,925 WebAssembly results with Node’s SHA-256 and check reports and intentional bugs.

Install the test browser once:

```sh
make browser-install
```

```sh
make test-browser
```

Browser checks cover desktop and mobile, report import and export, comparisons, theme selection, and accessibility.

Format source and docs with `make format`, or check them with `make format-check`.

```sh
make build
```

```sh
make preview PORT=5180
```

The static site is built into `dist/`. Serve it at a domain root over HTTPS. `public/_headers` supplies security headers for hosts that support that format; use equivalent headers on other hosts. This site does not provide a remote MCP endpoint.

For AWS Amplify, use the Amazon Linux 2023 build image. [amplify.yml](amplify.yml) selects Node 24, installs dependencies, runs tests, and builds `dist/`. [customHttp.yml](customHttp.yml) applies the site's security headers. No environment variables or C compiler are needed.

## C source and WebAssembly

The included WebAssembly build is ready to use; normal development needs no C compiler. Original Hashprobe files stay unchanged in `vendor/hashprobe/`. Its `source.json` records the source commit and file hashes. `public/wasm/build.json` records the compiler and build hashes, which are checked before tests and builds.

After changing the C bridge or build script, rebuild with [Emscripten](https://emscripten.org/docs/getting_started/downloads.html):

```sh
make wasm EMCC=/path/to/emcc
```

## License

MIT. Hashprobe and cJSON licenses are retained with their source. Geist and DM Mono are self-hosted through Fontsource under their included font licenses. The layout and typography follow [Dilate](https://dilate.co.ke/).
