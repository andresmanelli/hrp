/**
 * Virtual HRP Robot
 */

var VirtualRobot = function(robotFile){

  'use strict';

  var HRP = require('../hrp.js');
  var HRPDefs = HRP(0,0,true); //Only definitions
  var zmq = require('zmq');
  var colors = require('colors');
  var robot = require(robotFile);

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

  var virtualRobot = zmq.socket('rep');

  var X = 'x';
  var Y = 'y';
  var Z = 'z';

  var inverseK = robot.inverseK;

  var directK = robot.directK;

  virtualRobot.on('message', function(request) {
    
    var req = request.toString();  
    if(req === HRPDefs.COMP_ACK()){
      virtualRobot.send(HRPDefs.COMP_ACK());
    }else if(req === HRPDefs.ROBOT_INFO()){
      virtualRobot.send(robot.strInfo);
    }else if(req.substr(0,HRPDefs.SET_FE_DIF_POS().length) === HRPDefs.SET_FE_DIF_POS()){
      req = req.slice(HRPDefs.SET_FE_DIF_POS().length,req.length-1);
      var cmdVal = req.split(':');
      for(var i=1;i<cmdVal.length;i++){
        cmdVal[i] = parseFloat(cmdVal[i]);
      }
      virtualRobot.moveFE(cmdVal[0],cmdVal.slice(1));
      virtualRobot.send(HRPDefs.GENERAL_ACK());
    }else if(req === HRPDefs.GET_JOINTS()){
      //console.log(req);
      virtualRobot.send(HRPDefs.joints2str(robot.joints));
    }
  });

  virtualRobot.moveFE = function(dir,change){
    //console.log('Joints:',joints);
    //console.log('Pos',FEPos);

    if      (dir === HRPDefs.MU && (robot.FEPos[Z] + change[0]) >= 0){
      robot.FEPos[Z] += change[0];
    }else if(dir === HRPDefs.MD && ((robot.FEPos[Z] - change[0]) >= 0)){
      robot.FEPos[Z] -= change[0];
    }else if(dir === HRPDefs.MR && ((robot.FEPos[Y] + change[0]) >= 0)){
      robot.FEPos[Y] += change[0];
    }else if(dir === HRPDefs.ML && ((robot.FEPos[Y] - change[0]) >= 0)){
      robot.FEPos[Y] -= change[0];
    }else if(dir === HRPDefs.MF && ((robot.FEPos[X] + change[0]) >= 0)){
      robot.FEPos[X] += change[0];
    }else if(dir === HRPDefs.MB && ((robot.FEPos[X] - change[0]) >= 0)){
      robot.FEPos[X] -= change[0];
    }else if(dir === HRPDefs.M2 && ((robot.FEPos[X] + change[0]) >= 0) && ((robot.FEPos[Y] + change[1]) >= 0)){
      robot.FEPos[X] += change[0];
      robot.FEPos[Y] += change[1];
    }else if(dir === HRPDefs.MN){
      return true
    }else{
      return false;
    }
    
    if(!virtualRobot.updateJoints()){
      return false;
    }

    return true;
  };

  virtualRobot.updateFEPos = function(){
    var newFEPos = directK(robot.joints);
    
    for(var axis in newFEPos){
      if(robot.FEPos.hasOwnProperty(axis)){
        robot.FEPos[axis] = newFEPos[axis];
      }
    }
    
    return true;
  };

  virtualRobot.updateJoints = function(){
    var newJPos = inverseK(robot.FEPos,robot.joints);
    
    if(!newJPos)
      return false;
    
    for(var id in newJPos){
      if(robot.joints.hasOwnProperty(id)){
        robot.joints[id] = newJPos[id];
      }
    }
    
    return true;
  };

  //Value is percent
  virtualRobot.setJoints = function(ids,value){
    ids.forEach(function(id){
      if(robot.joints.hasOwnProperty(id)){
        robot.joints[id] = robot.jInfo[id].J_RANGE[1]*value;
      }
    });
  };

  virtualRobot.bind('tcp://*:5555', function(err) {
    if (err) {
      console.log(err);
    } else {
      console.log("Listening on 5555…");
    }
  });

  //Set initial position
  (function(){
    virtualRobot.updateFEPos();
  })();

  return virtualRobot;
};

module.exports = VirtualRobot;