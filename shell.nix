{
  source ? builtins.fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/archive/e7603eba51f2c7820c0a182c6bbb351181caa8e7.tar.gz";
    sha256 = "sha256:0mwck8jyr74wh1b7g6nac1mxy6a0rkppz8n12andsffybsipz5jw";
  },
  pkgs ? import source {}
}:

let
  inherit (pkgs) lib stdenv darwin;
  inherit (darwin.apple_sdk_11_0.frameworks) PCSC;
in pkgs.mkShell {
  name = "keycard-certify-shell";

  buildInputs = with pkgs; [ nodejs-18_x python310 ];
  propagatedBuildInputs = if stdenv.isDarwin then [ PCSC ] else [ pkgs.pcsclite ];

  env.NIX_CFLAGS_COMPILE = lib.optionalString (!stdenv.isDarwin)
    "-I ${lib.getDev pkgs.pcsclite}/include/PCSC";
}
