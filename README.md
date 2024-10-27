# Silu

**Silu** is a simple HTTP/HTTPS tunnel and proxy server of Deno.

## Installation

Make sure you have Deno runtime installed. Then, install Silu using the
following command:

```
deno install --allow-net --allow-read --allow-write --global https://deno.land/x/silu/main.ts
```

## Options

- `--timeout, -t` Timeout for each TCP connection.
- `--config, -c` Configuration file path.
- `--bind, -b` Bind address.

#### HTTP Options

- `--http.port` HTTP port.

#### HTTPS Options

- `--https.port` HTTPS port.
- `--https.crt` Certificate file path.
- `--https.key` Certificate key path.

#### Auth Options

- `--auth.username, --au` Authentication username.
- `--auth.password, --ap` Authentication password.
- `--auth.type, --at` Authentication type.

#### Log Options

- `--log.mode, --lm` Enable log with mode.
- `--log.level, --ll` Log level.
- `--log.dir, --ld` Log directory.
- `--log.rotate, --lr` Cut logs by day.
- `--log.max_bytes, --lmb` The max bytes for a single log file.
- `--log.max_backup_count, --lmc` The max number of log files to keep.
- Detail : https://github.com/deno-library/logger

#### For more information and options, use the `--help` option to see the help

message.

## Examples

Start an HTTP server:

```
silu --http.port 8080
```

Start an HTTPS server:

```
silu --https.port 8443 --https.crt cert.pem --https.key key.pem
```

Enable authentication:

```
silu --http.port 8080 --auth.type basic --auth.username admin --auth.password 123456
```

## Contributing

Contributions and issue reporting are welcome!

## License

This project is licensed under the [MIT License](LICENSE).
