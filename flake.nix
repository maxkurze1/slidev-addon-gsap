{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/release-25.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ ];
        };
      in
      {
        # devShells.default = self.packages.${system}.default;
        devShells.default = pkgs.mkShell {
          packages = [ pkgs.pnpm pkgs.nodejs ];
        };
      }
    );
}
