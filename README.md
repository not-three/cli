# not-th.re/cli

Please visit the [main](https://github.com/not-three/main) repository for more information.

## NPM

```bash
npm i -g @not3/cli
```

```bash
not3 --help
```

## Docker

```bash
docker run --rm -it -v "$(pwd):/data" ghcr.io/not-three/cli --help

# e.g. to encrypt a file
docker run --rm -it -v "$(pwd):/data" ghcr.io/not-three/cli crypto encrypt -f secret.txt -o secret.txt.enc
```

## Usage

```bash
not3 note save "hello world"          # save a note (alias: not3 s)
journalctl -u app | not3 s            # pipe logs, get a share url on stdout
not3 note get <id>                    # fetch + decrypt (alias: not3 g)
not3 file upload video.mp4            # upload a file (alias: not3 u)
not3 file download <id> out.mp4       # download a file (alias: not3 d)
not3 crypto encrypt -f x.txt -o x.enc # local encryption
not3 config set server https://my.api # global defaults (~/.config/not3/config.json)
not3 config set password hunter2      # bound to the server above, never sent elsewhere
```

Every flag can also be set via environment variables prefixed with `NOT3_`
(e.g. `NOT3_SERVER`, `NOT3_SEED`, `NOT3_OUTPUT_MODE`), and defaults live in a
global config file managed by `not3 config`. Output adapts automatically:
pretty (colors, progress bars, QR codes) on a terminal, machine-readable when
piped — override with `--output-mode pretty|simple|stdout|raw`.
