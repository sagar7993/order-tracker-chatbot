
/**
 * Dependencies.
 */

var Mind = require('../..');

keys=["order","wrong order","product","good product","refund","refund status"];
/**
 * Learn the XOR gate.
 */

var mind = Mind()
  .learn([
    { input: [0, 0], output: [ 0 ] },
    { input: [0, 1], output: [ 1 ] },
    { input: [1, 0], output: [ 1 ] },
    { input: [1, 1], output: [ 0 ] }
  ]);

var result = mind.predict([ 1, 0 ]);
console.log(result); // ~ 1
