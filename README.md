# Keycard Certify

To create certificates you should first fill in the form, specifying lot number, the quantity of cards for which you need to create a certificate, destination path for the certificates file and choose the output encryption PGP key. You also need a Keycard to sign the certificates. Path `m/43'/60'/1581'/2'/0` will be used to sign.

# Continuous Integration

The CI builds can be found in Jenkins under [keycard-certify](https://ci.infra.status.im/job/keycard-certify/).

The [`release`](https://ci.infra.status.im/job/keycard-certify/job/release/)` job builds the app for Linux, MacOS, and Windows, then publishes all artifacts to a GitHub release based on version set in `package.json`.
