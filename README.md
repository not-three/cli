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
not3 note save "hello world"          # save a note; print share alternatives (alias: not3 s)
journalctl -u app | not3 s            # pipe logs, get a share url on stdout
not3 note get <id>                    # fetch + decrypt (alias: not3 g)
not3 file upload video.mp4            # upload a file; print share alternatives (alias: not3 u)
not3 file download <id> out.mp4       # download a file (alias: not3 d)
not3 p2p send video.mp4               # share a live transfer link and available alternatives
not3 p2p receive <link> [output]       # receive; use --resume with a partial output
not3 crypto encrypt -f x.txt -o x.enc # local encryption
not3 config set server https://my.api # global defaults (~/.config/not3/config.json)
not3 config set password hunter2      # bound to the server above, never sent elsewhere
```

Every flag can also be set via environment variables prefixed with `NOT3_`
(e.g. `NOT3_SERVER`, `NOT3_SEED`, `NOT3_OUTPUT_MODE`), and defaults live in a
global config file managed by `not3 config`. Output adapts automatically:
pretty (colors, progress bars, QR codes) on a terminal, machine-readable when
piped — override with `--output-mode pretty|simple|stdout|raw`.

Each successful share (`not3 s`, `not3 u`, or `not3 p2p send`) prints its
available ways to open it in pretty and simple output. GCM notes and live P2P
shares omit commands that cannot decrypt them.
For example, a CBC note in simple mode shows:

```text
id: n1
seed: seedX
url: https://not-th.re/q/n1#az1zZWVkWA==
cli: not3 note get n1 --seed 'seedX'
docker: docker run --rm -it -v "$(pwd):/data" ghcr.io/not-three/cli note get n1 --seed 'seedX'
curl: curl https://raw.githubusercontent.com/not-three/main/refs/heads/main/scripts/decrypt-note.sh | bash -s https://api.not-th.re/note/n1/raw seedX
powershell: & ([scriptblock]::Create((irm https://raw.githubusercontent.com/not-three/main/refs/heads/main/scripts/decrypt-note.ps1))) 'https://api.not-th.re/note/n1/raw' 'seedX'
server: https://api.not-th.re/note/n1/decrypt?key=seedX
```

`stdout` still prints only the share URL, and `raw` still prints only the ID.

P2P transfer commands require Node.js 22 or newer. Reuse the printed seed with
`not3 p2p send <file> --seed <seed>` to restart an interrupted transfer.
