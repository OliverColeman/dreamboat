# Dreamboat

A motorised four-poster bed designed to move in surreal and dreamlike ways.

This repo is for the simulation and control software, other resources:

* [CAD (left-most tabs)](https://cad.onshape.com/documents/bd3016765e354329a00e385e/w/9dac436485b06c14c3fdbf1e/e/e112f41a4cf59c91cc31e8c7)
* [Parts and calculations](https://docs.google.com/spreadsheets/d/1MG6NdS5J7TmJZnU-6kurYT3Y7GUYQJ9q4y0apB9Fn-Y/edit?usp=sharing)

## Drive modes

### Day Tripper
Move in any direction while rotating.
https://user-images.githubusercontent.com/758108/134748559-ca3e713a-636c-460c-8c01-2cae2c0d2d2a.mp4

### Drive My Car
Drives something like a regular car.
https://user-images.githubusercontent.com/758108/134748673-8effc385-9acf-4d82-ab20-d586558d1f85.mp4

More details to come...

## Software

Currently just a simulation of controls and calculating steering geometry for different drive modes.

### Requirements

* [Node.js/NPM](https://nodejs.org)

## Setup

1. Clone the repo 
2. In the project directory for the repo run `npm install` to download required packages.

## Run the simulation

In the project directory run `npm run electron:start`
