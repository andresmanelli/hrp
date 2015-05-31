/**
 * List of the API components for existance tests on HRP
 */

// HRP DEFS
global.defs = [
	'robotInfoParams',
	'jointInfoParams',
	'check_id',
	'check_joint_value',
	'str2intArray',
	'str2Joints',
	'str2RobotInfo',
	'formatValue'
];

global.protocol = [
	'resolve',
	'avoidBlock',
	'fsm',
	'wait',
	'write',
	'read',
	'received',
	'setVirtual',
	'setPhysical',
	'connect',
	'disconnect',
	'virtual',
	'path',
	'port',
	'isHRP',
	'getRobotInfo',
	'setFEDifPos',
	'getJoints'
];

global.frames = {
  
  'GENERAL_ACK': {
  	frame: /^:HRP:GA:$/
  },
  'COMP_ACK': {
  	frame: /^:HRP:CA:$/
  },
  'ROBOT_INFO': {
  	frame: /^:HRP:INFO:R:$/
  },
  'JOINT_INFO': {
  	frame: /^:HRP:INFO:J:[0-9][0-9][0-9]/
  },
  'SET_JOINT': {
  	frane: /^:HRP:S:J:[0-9][0-9][0-9]:[0-9][0-9][0-9]/
  },
  'SET_FE_DIF_POS': {
  	frame: /^:HRP:S:FE:[0-9]+[.]+[0-9]{2}:[0-9]+[.]+[0-9]{2}:[0-9]+[.]+[0-9]{2}:$/
  },
  'GET_JOINT': {
  	frame: /^:HRP:G:J:[0-9][0-9][0-9]:$/
  },
  'GET_JOINTS': {
  	frame: /^:HRP:G:AJ:$/
  }
};

global.frame_parts = [
	'SEP',
	'HRP',
	'CA',
	'GA',
	'GET',
	'SET',
	'FE'
];

global.joy_cmds = [
	'MU',
	'MD',
	'ML',
	'MR',
	'MF',
	'MB',
	'MN',
	'M2',
	'M3'
];