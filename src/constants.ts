export const maxSpeed = 5 * (1000*1000)/(60*60); // mm/s  (There are (1000*1000)/(60*60) mm/s in 1 km/h)
export const maxRPS = 0.1; // Revolutions/second
export const movementMagnitudeThreshold = 0.03;

export const visualScale = 0.05; // px/mm

export const bedSize = [ 1530, 2030 ]
export const wheelCentreMargin = 250;
export const wheelDiameter = 350;
export const wheelWidth = 60;
export const wheelPositions = [
  [ -bedSize[0]/2 + wheelCentreMargin, -bedSize[1]/2 + wheelCentreMargin ],
  [  bedSize[0]/2 - wheelCentreMargin, -bedSize[1]/2 + wheelCentreMargin ],
  [ -bedSize[0]/2 + wheelCentreMargin,  bedSize[1]/2 - wheelCentreMargin ],
  [  bedSize[0]/2 - wheelCentreMargin,  bedSize[1]/2 - wheelCentreMargin ],
]
