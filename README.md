# Dreamboat

A motorised four-poster bed designed to move in surreal and dreamlike ways.

This repo is for the simulation and control software, other resources:

* [CAD (left-most tabs)](https://cad.onshape.com/documents/bd3016765e354329a00e385e/w/9dac436485b06c14c3fdbf1e/e/e112f41a4cf59c91cc31e8c7)
* [Parts and calculations](https://docs.google.com/spreadsheets/d/1MG6NdS5J7TmJZnU-6kurYT3Y7GUYQJ9q4y0apB9Fn-Y/edit?usp=sharing)

## Drive modes

### Day Tripper
Move in any direction while rotating.

https://user-images.githubusercontent.com/758108/134749559-07ade6a9-ca92-4bd3-abc6-9f58cb7e7076.mov

### Drive My Car
Drives something like a regular car.

https://user-images.githubusercontent.com/758108/134749580-d9eab524-bbcb-4e91-acaa-18213465764a.mov

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
