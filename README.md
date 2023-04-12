# Dreamboat

A motorised four-poster bed designed to move in surreal and dreamlike ways.

This repo is for the control software running in the hand-held controller on a Raspberry Pi.

Other resources:

* [CAD (left-most tabs)](https://cad.onshape.com/documents/bd3016765e354329a00e385e/w/9dac436485b06c14c3fdbf1e/e/8390b3ed99dc8b90666554f9)
* [Gallery](https://photos.app.goo.gl/ytKKa88Wky2qWHh17)
* [Repo for the drive and steering motor and sensor controller code and PCB design](https://github.com/OliverColeman/dreamboat_downlow)
* [Parts and calculations](https://docs.google.com/spreadsheets/d/1MG6NdS5J7TmJZnU-6kurYT3Y7GUYQJ9q4y0apB9Fn-Y/edit?usp=sharing)

## Setup

1. Install requirements (tested on Ubuntu 22.04):  
   * [Node.js v16](https://nodejs.org)
   * ```
     sudo apt-get install build-essential clang libdbus-1-dev libgtk-3-dev \
                         libnotify-dev libasound2-dev libcap-dev \
                         libcups2-dev libxtst-dev \
                         libxss1 libnss3-dev curl \
                         gperf bison python3-dbusmock openjdk-8-jre
     ```
2. Clone the repo.
3. In the project directory for the repo run `./rebuild.sh`.

## Run the simulation

In the project directory run `./run.sh`
