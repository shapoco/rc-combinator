#!/bin/bash

# https://emscripten.org/docs/getting_started/downloads.html

set -eux

rm -rf ./emsdk
git clone https://github.com/emscripten-core/emsdk.git
pushd ./emsdk
  git pull
  ./emsdk install latest
  ./emsdk activate latest
  source ./emsdk_env.sh
popd

