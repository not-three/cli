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
docker run --rm -it -v "$(pwd):/data" ghcr.io/not-three/cli encrypt -f secret.txt -o secret.txt.enc
```
