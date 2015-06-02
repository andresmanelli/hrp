/**
 * Virtual HRP Robot
 */

var ScaraRobot = (function(){

  'use strict';

  var HRP = require('../hrp.js');
  var HRPDefs = HRP(0,0,true); //Only definitions
  var zmq = require('zmq');
  var colors = require('colors');

  // Colors config
  colors.setTheme({
    input: 'blue',
    verbose: 'cyan',
    prompt: 'white',
    explain: 'white',
    info: 'green',
    data: 'yellow',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
  });

  var robot = {};

  var Arm0L = 20;
  var Arm1L	= 26;

  var X = 'x';
  var Y = 'y';
  var Z = 'z';
  var Q0 = 10;
  var Q1 = 23;
  var Q2 = 45;

  // 0--2*PI
  var ang = function(x1, y1, x2, y2){
      
      var deltax = (x2-x1);
      var deltay = (y2-y1);
      
      //Same point
      if(deltax == 0 && deltay == 0)
          return 0;
      
      if(deltax == 0){
          if(deltay > 0)
              return Math.PI/2;
          else if (deltay < 0)
              return -Math.PI/2;
      }
      if(deltay == 0){
        if(deltax > 0)
          return 0;
        else if (deltax < 0)
          return -Math.PI;
      }
      
      var tmpang = Math.atan(deltay/deltax);
      
      if(deltax > 0 && deltay > 0){
        //Primer Cuadrante
        return tmpang;
      }
      else if(deltax < 0 && deltay > 0){
        //Segundo Cuadrante
        return -tmpang + Math.PI/2.0;
      }
      else if(deltax < 0 && deltay < 0){
        //Tercer Cuadrante
        return tmpang + Math.PI;
      }
      else if(deltax > 0 && deltay < 0){
        //Cuarto Cuadrante
        return -tmpang + 2*Math.PI;
      }
  };

  //c2x,c2y posiciones del extremo del segundo brazo
  var int2Circ = function(c2x, c2y){
    
      var x1,x2,y1,y2;
      var sign;
      
      //OK
      if(c2x == 0 && c2y != 0){
        sign = Math.abs(c2y)/c2y;
        c2y = Math.abs(c2y);
        x1 = Math.sqrt(Arm0L*Arm0L-0.25*(Arm0L - Arm1L + c2y)*(Arm0L - Arm1L + c2y));
        x2 = -x1;
        y1 = Math.sqrt(Arm0L*Arm0L-x1*x1)*sign;
        y2 = y1;
        return [x1,y1,x2,y2];
      }
      //OK
      if(c2y == 0 && c2x != 0){
        sign = Math.abs(c2x)/c2x;
        c2x = Math.abs(c2x);
        y1 = Math.sqrt(Arm0L*Arm0L-0.25*(Arm0L - Arm1L + c2x)*(Arm0L - Arm1L + c2x));
        y2 = -y1;
        x1 = Math.sqrt(Arm0L*Arm0L-y1*y1)*sign;
        x2 = x1;
        return [x1,y1,x2,y2];
      }
      
      if(c2x==0 && c2y ==0){
        //No solution
        return false;
      }
       
      var alpha = Math.atan(c2y/c2x);
      var c2x_p = c2x;
      
      if((c2x < 0 && c2y > 0) || (c2x < 0 && c2y < 0)){
        //Segundo o Tercer Cuadrante. Espejamos.
        alpha = -alpha;
        c2x_p = -c2x;
      }
          
      var R = [Math.cos(alpha),Math.sin(alpha),-Math.sin(alpha),Math.cos(alpha)];
      var R_1 = [Math.cos(alpha),-Math.sin(alpha),Math.sin(alpha),Math.cos(alpha)];
      var c2u = R[0]*c2x_p+R[1]*c2y;
      var c2v = 0; //Always
      
      var int = int2Circ(c2u,c2v);
      x1 = R_1[0]*int[0]+R_1[1]*int[1];
      y1 = R_1[2]*int[0]+R_1[3]*int[1];
      x2 = R_1[0]*int[2]+R_1[1]*int[3];
      y2 = R_1[2]*int[2]+R_1[3]*int[3];
      
      if((c2x < 0 && c2y > 0) || (c2x < 0 && c2y < 0)){
        //Segundo o Tercer Cuadrante. Espejamos.
        x1 = -x1;
        x2 = -x2
      }
      
      return [x1,y1,x2,y2];
  };

  //artRef, object with joints angles in RADIANS 0--2*PI
  //phP object x,y,z
  robot.inverseK = function(phP, artRef){
         
      var fartP = {};
      
      var x1,y1,x2,y2;
      var inter = int2Circ(phP[X],phP[Y]);
      
      if(isNaN(inter[0])){
        return false;
      }
      x1 = inter[0];y1 = inter[1];x2 = inter[2];y2 = inter[3];
      var ang11,ang12,ang21,ang22;
      ang11 = ang(0,0,x1,y1);
      ang12 = ang(0,0,x2,y2);
      ang21 = ang(x1,y1,phP[X],phP[Y]);
      ang22 = ang(x2,y2,phP[X],phP[Y]);  
    
      var w1 = 2*Math.abs(artRef[Q0]-ang11) + Math.abs(artRef[Q1]-ang21);
      var w2 = 2*Math.abs(artRef[Q0]-ang12) + Math.abs(artRef[Q1]-ang22);
      
      if(w1>w2 || w1==w2){
          fartP[Q0] = ang12;
          fartP[Q1] = ang22;
      }
      else{
          fartP[Q0] = ang11;
          fartP[Q1] = ang21;
      }
      
      // OK?
      fartP[Q2] = phP[Z];
      
      return fartP;
  };

  robot.directK = function(joints){

    var x = Arm0L*Math.cos(joints[Q0])+Arm1L*Math.cos(joints[Q0]+joints[Q1]-Math.PI);
    var y = Arm0L*Math.sin(joints[Q0])+Arm1L*Math.sin(joints[Q0]+joints[Q1]-Math.PI);
    var z = joints[Q2];
    
    var newFEPos = {};
    newFEPos[X] = x;
    newFEPos[Y] = y;
    newFEPos[Z] = z;
    
    return newFEPos;
  };

  // Converts from degrees to radians.
  var radians = function(degrees) {
    return degrees * Math.PI / 180;
  };
   
  // Converts from radians to degrees.
  var degrees = function(radians) {
    return radians * 180 / Math.PI;
  };

  robot.FEPos = {
    x: 46,
    y: 0,
    z: 0
  };

  // Values
  robot.joints = {
    10: 0,
    23: radians(180),
    45: 0
  };

  robot.info = {
    B: 'F.Ing - U.N.Cuyo', //Brand
    M: 'Generic Virtual Robot', //Model
    DOF: '3', //Degrees of freedom
    J: [10,23,45],  //Joints IDs
  };

  robot.jInfo = {
    10: {
      J_TYPE: 'R',
      J_DESC: 'Stepper Motor',
      J_RANGE: [0, 70],
      J_UNITS: 'deg'
    },
    23: {
      J_TYPE: 'R',
      J_DESC: 'DC Motor',
      J_RANGE: [0, 300],
      J_UNITS: 'deg'
    },
    45: {
      J_TYPE: 'T',
      J_DESC: 'No Desciption',
      J_RANGE: [0, 400],
      J_UNITS: 'mm'
    }
  };

  robot.strInfo = HRPDefs.robotInfo2str(robot.info,robot.jInfo);

  return robot;
})();

module.exports = ScaraRobot;