/**
 * measurementMatrix.js
 * DP010 specific matrix conversion and scaling logic helper skeleton.
 */

export function calculateSteps(basicsize, steps, currentVal, targetSize, fullhalf) {
  // Skeleton implementation for sizing formulas
  return currentVal + (parseFloat(targetSize) - parseFloat(basicsize)) * parseFloat(steps);
}

export function pivotData(measurements, values, sizeRun) {
  // Skeleton to pivot flat measurements & values into 2D row structures
  return measurements.map(m => {
    const row = { ...m };
    sizeRun.forEach(sz => {
      const valObj = values.find(v => v.dp011gkey === m.gkey && v.size === sz);
      row[sz] = valObj ? valObj.cvalue : undefined;
    });
    return row;
  });
}
