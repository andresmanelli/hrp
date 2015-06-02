/**
 * HID Robot Protocol (HRP)
 *
 * V0.1
 *
 * Author: Andrés Manelli
 * email: andresmanelli@gmail.com
 *
 * Asociación de Mecatrónica de Mendoza
 */

'use strict';

/**
 * Module main function. Use as:
 *   var HRP = require('./HRP.js');
 *   var robot = HRP(PATH,PORT_IF_VIRTUAL,ONLY_DEFS);
 *   
 * @param {String} path  Path of the HRP compilant robot
 * @param {Integer} port  Port used to comunicate with a virtual HRP compilant
 * robot
 * @param {Bool} rdefs If true, returns only static definitions.
 */
var hrp = function(path,port,rdefs){

  // Dependencies
  var colors = require('colors');
  var StateMachine = require("javascript-state-machine")
  var HID = require('node-hid');
  var zmq = require('zmq');
  var Promise = require('es6-promise').Promise;

  // Colors for the prompt
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
    
  /** @type {Object} Stores the public functionality of the module */
  var protocol = {};
  /** @type {Object} Stores the static definitions */
  var defs = {};
  /** @type {Boolean} true if protocol is connected */
  var connected = false;  

  // Relation between the protocol identifiers and their description
  defs.robotInfoParams = {
    B: {type: 'str', desc: 'Brand'},
    M: {type: 'str', desc: 'Model'},
    DOF: {type: 'int', desc: 'Degrees_of_Freedom'},
    J: {type: 'intArray', desc: 'Joints_IDs'}
  };
  
  // Relation between the protocol identifiers and their description
  defs.jointInfoParams = {
    J_TYPE: {type: 'str', desc: 'Joint_Type'},
    J_DESC: {type: 'str', desc: 'Joint_Description'},
    J_RANGE: {type: 'intArray', desc: 'Joint_Range'},
    J_UNITS: {type: 'str', desc: 'Joint_Units'}
  };
  
  // Joints IDs must be three digits wide, i.e., from 0 to 999
  defs.check_id = function(id){
    if(id === null || typeof id === 'undefined')
      return false;

    if (id < 0){
      console.log(colors.warn('WARNING: ID < 0, do not send frame'));
      return false;
    }else if (id > 999){
      console.log(colors.warn('WARNING: ID > 999, do not send frame'));
      return false;
    }else{
      return id;
    }
  };

  // Protocol frame elements
  defs.SEP = ':';
  defs.ARRAY_SEP = ',';
  defs.HRP = 'HRP'; // HID Robot Protocol
  defs.CA = 'CA'; // Compilance Ack
  defs.GA = 'A'; // General Ack
  defs.INFO = 'INFO'; // Info about something
  defs.GET = 'G'; // Get something
  defs.GET_ALL = 'GA';
  defs.SET = 'S'; // Set something
  defs.SET_ALL = 'SA';
  defs.EE = 'EE'; // End Effector
  defs.JOINT = 'J'; // Joint
  defs.ROBOT = 'R'; // Robot
  defs.VAL = 'V'; // Value

  /**
   * Converts a string to an Integer array
   * @param  {String} str String containing the array. Example: '1245'
   * @return {Array}     Integer array. For the example above it should be
   *                     [1,2,4,5]
   */
  defs.str2intArray = function(str){
    var res = [];
    for(var i=0;i<str.length;i++){
      res.push(str.charCodeAt(i));
    }
    
    return res;
  };
  
  /**
   * Converts a string to an Object representing the joints' state. The string
   * has the joints IDs and their positions.
   * @param  {String} str String containing the array. Example:
   *                      ':10:2.34:23:0.34:45:23.00:'
   * @return {Object}     Double array. For the example above it should be:
   *                      {10: 2.34, 23: 0.34, 45: 23.00}
   */
  defs.str2Joints = function(str){
    var joints = {};    
    var tmp = str.substr(defs.GET_JOINTS().length,str.length);
    tmp = tmp.split(':');
    tmp.pop();
    for(var i=0;i<tmp.length;i+=2){
      joints[tmp[i]] = parseFloat(tmp[i+1]);
    }
    
    return joints;
  };

  /**
   * Converts a string into an Object with the robot's information
   * @param  {String} str Info coded as string, defined by the HRP
   * @return {Object}     Robot's information
   */
  defs.str2RobotInfo = function(str){
    str = str.split(defs.SEP);
    // Extract the preambule and the last ':''
    str.shift();
    str.shift();
    str.shift();
    str.shift();
    str.pop();
    // Object to return
    var info = {};
    // Info parameter. Ex: Brand, Model, etc
    var param;
    // In general: PARAM:VALUE. That's why i+=2
    for(var i=0;i<str.length;i+=2){
      param = defs.robotInfoParams[str[i]];
      // Parse value according to its type
      if(param.type === 'str'){
        info[defs.robotInfoParams[str[i]].desc] = str[i+1];
      }else if(param.type === 'intArray'){
        // arrays are separated by ','
        var arr = str[i+1].split(defs.ARRAY_SEP);
        var intarr = [];
        for(var j=0;j<arr.length;j++)
          intarr.push(parseInt(arr[j]));
        info[defs.robotInfoParams[str[i]].desc] = intarr;
        // Info of Joints is another substring with IDs and values. We do
        // i+=2 because we are here --> J:ID1:J_TYPE:TYPE:J_DESC:DESC:[...]
        // and then we are here -- > ID1:J_TYPE:TYPE:J_DESC:DESC:[...]
        // J_TYPE,J_RANGE, etc, may not be in order!!
        if(str[i] == 'J'){
          i+=2;
          // Sub-Object for joints information
          info['Joints'] = {};
          // intarr has the IDs of the joints
          for(var j=0;j<intarr.length;j++){
            // Sub-Object containing the joint-specific information
            info.Joints[intarr[j]] = {};
            // Magic number: 4. We have four parameters for each joint.
            // TODO: Parametrize this
            for(var h=0;h<4;h++){
              //////////////////////////////////
              // Trust me, I'm an Engineer... //
              //////////////////////////////////
              param = defs.jointInfoParams[str[i+2*4*j+2*h]];
              if(param.type === 'str'){
                info.Joints[intarr[j]][param.desc] = str[i+2*4*j+2*h+1];
              }else if(param.type === 'intArray'){
                var arr2 = str[i+2*j*4+2*h+1].split(defs.ARRAY_SEP);
                var intarr2 = [];
                for(var k=0;k<arr2.length;k++){
                  intarr2.push(parseInt(arr2[k]));
                }
                info.Joints[intarr[j]][param.desc] = intarr2;
              }else if(param.type === 'int'){
                info.Joints[intarr[j]][param.desc] = parseInt(str[i+2*4*j+2*h+1]);
              }else{
                console.log(colors.warn('Type of info not supported! (%s)'),param.type);
              }
              //////////////////////////////////
              // Trust me, I'm an Engineer... //
              //////////////////////////////////
            }
          }
          i+=2*j*h;
        }
      }else if(param.type === 'int'){
        info[defs.robotInfoParams[str[i]].desc] = parseInt(str[i+1]);
      }else{
        console.log(colors.warn('Type of info not supported! (%s)'),param.type);
      }
    }
    return info;
  };

  /**
   * Converts an object with the robot info in a hrp string
   * @param  {Object} info  Robot's basic info
   * @param  {Object} jInfo Robot's joints info
   * @return {String}       The info in a hrp formatted string
   */
  defs.robotInfo2str = function(info,jInfo){
    var str = ':HRP:INFO:R';

    for (var key in info){
      if(info.hasOwnProperty(key)){
        str += [':', key, ':', info[key]].join('');
        if(key === 'J'){
          for(var i=0;i<info[key].length;i++){
            for(var key2 in jInfo[info[key][i]]){
              if(jInfo[info[key][i]].hasOwnProperty(key2)){
                str += [':', key2, ':', jInfo[info[key][i]][key2]].join('');
              }
            }
          }
        }
      }
    }

    str += ':';

    return str;
  };
  /**
   * Converts an object containing the joints values into a hrp string
   * @param  {Object} joints Joints' values of the form: { ID: VALUE, ...}
   *                         Where ID is an integer between 0 and 999
   * @return {String}        The values in a hrp formatted string
   */
  defs.joints2str = function(joints){
    var str = defs.GET_JOINTS();

    for(var id in joints){
      if(joints.hasOwnProperty(id)){
        str = [str,id,':',defs.formatValue(joints[id]),':'].join('');
        //Below is percent
        //str = [str,id,':',('00'+Math.floor((joints[id]/parseFloat(virtualRobotJInfo[id].J_RANGE[1]))*100)).substr(-3),':'].join(''); 
      }
    }
    
    return str;
  };

  /**
   * We format a decimal value and print only two decimals. V-REP script is
   * coded in LUA and it's complicated to work with floating point numbers. We
   * know this way how the string will look like and then we parse each part
   * (integer and decimal) in V-REP.
   * @param  {Double} val Decimal value
   * @return {String}     String with the format X.XX
   */
  defs.formatValue = function(val){
    // Sign
    var sign = val<0?'-':'';
    var absval = Math.abs(val);
    // Integer part
    var int = Math.floor(absval);
    // Decimal part
    var dec = Math.round(Math.abs((val-int)*100));
    // Force two decimals, even if it is .00
    var str = [sign,int,'.',('00'+dec).substr(-2)].join('');
    
    return str;
  };

  // Ack frame
  defs.GENERAL_ACK = function(){
    return [  defs.SEP,
              defs.HRP,
              defs.SEP,
              defs.GA,
              defs.SEP].join('');
  };

  // HRP compilance test frame
  defs.COMP_ACK = function(){
    return [  defs.SEP,
              defs.HRP,
              defs.SEP,
              defs.CA,
              defs.SEP].join('');
  };
                
  // Robot's information request frame
  defs.ROBOT_INFO = function(){
    return [  defs.SEP,
              defs.HRP,
              defs.SEP,
              defs.INFO,
              defs.SEP,
              defs.ROBOT,
              defs.SEP].join('');
  };

  // Joint's information request frame
  defs.JOINT_INFO = function(id){
    id = defs.check_id(id);
    if(!id)
      return 'E';
    return [  defs.SEP,
              defs.HRP,
              defs.SEP,
              defs.INFO,
              defs.SEP,
              defs.JOINT,
              defs.SEP,
              ('00'+id).substr(-3),
              defs.SEP].join('');
  };
                                    
  // Joint's value set frame
  defs.SET_JOINT =  function(value){
    value = defs.check_joint_value(value);
    return [  defs.SEP,
              defs.HRP,
              defs.SEP,
              defs.SET,
              defs.SEP,
              defs.JOINT,
              defs.SEP,
              ('00'+value).substr(-3),
              defs.SEP].join('');
  };
  
  // End Effector set frame. Differential movement in one direction.
  // TODO: UNITS. If called without arguments, returns the preambule
  defs.SET_EE_DIF_POS = function(values){

    var header = [  defs.SEP,
                    defs.HRP,
                    defs.SEP,
                    defs.SET,
                    defs.SEP,
                    defs.EE,
                    defs.SEP,
                    defs.VAL].join('');

    if(typeof values === 'undefined' || values === null){
        return header;
    }  

    if( Object.prototype.toString.call(values) !== '[object Array]' || values.length !== 3) {
        return false;
    }
      return [  header,
                (function(){
                  var vals = '';
                  values.forEach(function(val){
                    vals = vals.concat(defs.SEP, defs.formatValue(val));
                  });
                  return vals;
                })(),
                defs.SEP].join('');
  };

  // Joint's value get frame
  defs.GET_JOINT =  function(id){ 
    id = defs.check_id(id);
    if(!id)
      return false;
    return [  defs.SEP,
              defs.HRP,
              defs.SEP,
              defs.GET,
              defs.SEP,
              defs.JOINT,
              defs.SEP,
              ('00'+id).substr(-3),
              defs.SEP].join('');
  };
  
  // All Joints' values get frame
  defs.GET_JOINTS =  function(){ 
    return [  defs.SEP,
              defs.HRP,
              defs.SEP,
              defs.GET_ALL,
              defs.SEP,
              defs.JOINT,
              defs.SEP].join('');
  };


  // Used by the wait timeout
  protocol.resolve = function(){};
  // Used by the wait timeout
  protocol.avoidBlock = -1;
  // Used by the wait timeout
  protocol.timeout = 1000;

  /**
   * Creates a per-robot state machine to follow the protocol frame orders.
   */
  protocol.fsm = StateMachine.create({
    initial: 'idle',
    events: [
      {name: 'sendAck',           from: 'idle',     to: 'waitAck'},
      {name: 'ackReceived',       from: 'waitAck',  to: 'idle'},
      {name: 'requestRobotInfo',  from: 'idle',     to: 'waitRobotInfo'},
      {name: 'gotRobotInfo',      from: 'waitRobotInfo',     to: 'idle'},
      {name: 'setEEDifPos',       from: 'idle',     to: 'waitAck'},
      {name: 'getJoints',         from: 'idle',     to: 'waitJoints'},
      {name: 'gotJoints',         from: 'waitJoints',  to: 'idle'}
    ],
    callbacks: {
      onsendAck: function(event, from, to){ 
        protocol.write(defs.COMP_ACK());
      },
      onrequestRobotInfo: function(event, from, to){
        protocol.write(defs.ROBOT_INFO());
      },
      onsetEEDifPos: function(event,from,to,values){
        protocol.write(defs.SET_EE_DIF_POS(values));
      },
      ongetJoints: function(event,from,to){
        protocol.write(defs.GET_JOINTS());
      }
    }
  });

  /**
   * Creates a timeout, preventing infinite waits while reading a robot.
   * resolves the Promise that called it, with the data specified in the
   * calling function.
   */
  protocol.wait = function(){
    protocol.avoidBlock = setTimeout(function(){
      protocol.resolve('timeout');
    }, protocol.timeout);
  };

  /**
   * Writes a message to the robot.
   * @param  {String} msg Already encoded message.
   */
  protocol.write = function(msg){
    if(protocol.virtual){
      if(protocol.sock){
        protocol.sock.send(msg);
      }else{
        //console.log(colors.warn('HRP.write(): Tryed to send message to socket, but robot is disconnected'));
      }
    }else{
      try{
        console.log(robot,defs.str2intArray(msg));
        protocol.robot.write(defs.str2intArray(msg));
      }catch(err){
        //console.log(colors.warn(err));
      }
    }
  };

  /**
   * Called when something was read from the robot. We clear the wait timeout
   * and continue normal flow resolving the calling Promise with the received
   * message.
   * @param  {String} msg Received message
   */
  protocol.received = function(msg){
    clearTimeout(protocol.avoidBlock); //Something was received
    protocol.resolve(msg.toString());
  };

  /**
   * Performs a lecture from the robot. Resolves the Promise with the read
   * message.
   */
  protocol.read = function(){
    
    return new Promise(function(resolve, reject){
      
      // Global data for the timeout
      protocol.resolve = resolve;
      protocol.wait();
      
      if(!protocol.virtual){
        protocol.robot.read(function(err, msg){
          // Something was received
          clearTimeout(protocol.avoidBlock);
          if(err){
            resolve(false);
          }else{
            resolve(msg.toString());
          }
        });
      }
    });
  };

  /**
   * Verifies that this device is (or not) a HRP compatible robot. Resolve the
   * Promise with true or false. We don't reject in case of not-compilance
   * because this way we can group many calls to isHRP(...) and test all the
   * results together with Promise.all(...).
   *
   * This is the only function that connects and disconnects itself. Careful.
   */
  protocol.isHRP = function(){
      
      if(protocol.fsm.current !== 'idle'){
        return Promise.resolve(false);
      }
      
      return new Promise(function(resolve, reject){
        if(!protocol.connect()){
          resolve(false);
        }else{
          protocol.fsm.sendAck();
          protocol.read().then(function(msg){
              protocol.disconnect();
              protocol.fsm.ackReceived();
              if(msg === defs.COMP_ACK()){
                resolve(true);
              }else{
                resolve(false);
              }
          }).catch(function(err){
              protocol.disconnect();
              resolve(false);
          });
        }
      });
  };

  /**
   * Requests the robot's information. Resolves the Promise with the obtained
   * information or it is rejected otherwise.
   */
  protocol.getRobotInfo = function(){
    
    if(protocol.fsm.current !== 'idle'){
      return Promise.reject();
    }
    
    if(!connected)
      return Promise.reject('Not connected');

    return new Promise(function(resolve, reject){
        
        //First Connect!!
        protocol.fsm.requestRobotInfo();
        protocol.read().then(function(msg){
          protocol.fsm.gotRobotInfo();
          if(msg === false)
            reject(false);
          if(msg.substr(0,12) !== defs.ROBOT_INFO())
            reject(false);
          resolve(msg);
        },function(err){
          reject(err);
        });
      });
  };

  /**
   * Sends the order of End Effector movement to the robot. If the robot
   * does not respond with an ACK, then the Promise is rejected.
   * @param {String} move  Direction of movement. ('MU','MD','ML','MR','MF','MB','MN')
   * @param {String} value Amount of movement. SHOULD BE X.XX TODO!!
   */
  protocol.setEEDifPos = function(values){
      
      if(protocol.fsm.current !== 'idle'){
        return Promise.reject();
      }

      if(!connected)
        return Promise.reject('Not connected');

      return new Promise(function(resolve, reject){
        // First Connect!
        protocol.fsm.setEEDifPos(values);
        protocol.read().then(function(msg){
          protocol.fsm.ackReceived();
          if(msg === defs.GENERAL_ACK()){
            resolve(true);
          }else{
            reject(false);
          }
        },function(err){
          reject(err);
        });
      });
  };
  
  /**
   * Request all joints' values. Resolve the Promise with a string got from
   * the robot. This string is then parsed by defs.str2Joints(...).
   */
  protocol.getJoints = function(){
    
    if(protocol.fsm.current !== 'idle'){
      return Promise.reject();
    }
      
    return new Promise(function(resolve, reject){

      // First Connect!
      protocol.fsm.getJoints();
      protocol.read().then(function(msg){
          protocol.fsm.gotJoints();
          resolve(msg);
        },function(err){
          reject();
      });
    });
  };

  protocol.connected = function(){
    return connected;
  };

  /**
   * Connects to the robot.
   * @return {Bool} True if success. False otherwise.
   */
  protocol.connect = function(){
    
    if(protocol.connected()){
      return false;
    }

    if(protocol.virtual){
      protocol.sock = zmq.socket('req');
      protocol.sock.connect('tcp://localhost:'+protocol.port);
      protocol.sock.on('message',protocol.received);
      connected = true;
      return true;
    }else{
      var devs = HID.devices();
      
      if(!devs.some(function(dev){
        if(dev.path === protocol.path){
          return true;
        }
      })){
        connected = false;
        return false;
      }else{
        try{
          protocol.robot = new HID.HID(protocol.path);
          connected = true;
          return true;
        }catch(err){
          console.log(colors.debug('in connect(): '),colors.error('Cannot open device'));
          connected = false;
          return false;
        }
      }   
    }
  };

  /**
   * Disconnects the robot. TODO: Close the socket? Catch error?
   * @return {[type]} [description]
   */
  protocol.disconnect = function(){

    if(!protocol.connected()){
      return false;
    }

    if(protocol.virtual){
      if(protocol.sock){
        delete protocol.sock;
        connected = false;
        return true;
      }
    }else{
      if(protocol.robot){
        protocol.robot.close();
        connected = false;
        return true;
      }
    }
  };

  /**
   * Change the type of robot to virtual, specifying the port to be used.
   * @param {Integer} port Port to be used by protocol.sock
   */
  protocol.setVirtual = function(port){
    protocol.disconnect();
    protocol.virtual = true;
    protocol.port = port;
  };

  /**
   * Change the type of robot to a physical one, specifying the path to be
   * used. TODO: Check the path for existance.
   * @param {String} path HID path of the robot.
   */
  protocol.setPhysical = function(path){
    protocol.disconnect();
    protocol.virtual = false;
    protocol.path = path;
  };
  
  // Check whether to return only static definitions or the whole protocol
  // Object. If we return the protocol Object, we add also the definitions!
  
  if(rdefs){
    return defs;
  }
  else{ 
    // Check if we passed the robot's path
    if(typeof path === 'undefined'){
      console.log(colors.warn('No path provided! Returning false.'));
      return false;
    }
    
    // Save the robot's path
    protocol.path = path;

    // If the robot ir virtual, check if we passed the robot's port
    if(protocol.path === 'virtual'){
      if(typeof port === 'undefined' || port === null){
        console.log(colors.warn('No port provided! returning false'));
        return false;
      }
      // Save the port
      protocol.virtual = true;
      protocol.port = port;
    }else{
      protocol.virtual = false;
      protocol.port = -1;
    }
  
    for(var key in defs){
      if(defs.hasOwnProperty(key))
        protocol[key] = defs[key];
    }

    return protocol;
  }
};

// Expose the module.
module.exports = hrp;
