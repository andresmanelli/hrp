# hrp (HID Robot Protocol)
Module that implements a protocol for talking to robots over a HID-USB communication

## Install

```
npm install hrp
```

## Use

```js
var HRP = require('hrp');

var robot_handler = HRP('USB_PATH','PORT_IF_VIRTUAL','ONLY_DEFS');
```
Where:

* USB_PATH is the path to the device (XXXX:XXXX:XX) or 'virtual'
* PORT_IF_VIRTUAL is the port used when talking to a virtual robot
* ONLY_DEFS is true if you want only the protocol definitions and helper functions

## Protocol
### Generalities
* Every frame must start and finish with ```:```
* Every frame must have the preamble ```:HRP```
* The isssued command follows the preamble
  * Get: ```G```
  * Set: ```S```
  * Get All: ```GA```
  * Set All: ```SA```
* The target device follows the command
  * Robot: ```R```  
  * Joint(s): ```J```
  * End Effector: ```EE```
* The target property follows the device
  * Info: ```INFO```
  * Value: ```V```
* Every part of the frame is followed by ```:```
* Arrays items are separated by ```,```
* Decimal point is actually a point ```1.23```
* The robot must ACK the received _Set_ command even if it can not complete the operation (e.g., move the end effector to desired position)
* The robot must not ACK the received _Get_ command, it should only send the requested information
  * ACK: ```A```
  * Compliance ACK: ```CA```
* The robot should send the following general information when asked to:
  * Brand (string) (```B```)
  * Model (string) (```M```)
  * Degrees of Freedom (positive integer) (```DOF```)
  * Joints' IDs (array of positive integers between 0 and 999) (```J```)
* The robot should send the following information about a joint when asked to:
  * Joint Type (string, e.g., 'R', 'T') (```J_TYPE```)
  * Joint Description (string, e.g., 'Stepper Motor') (```J_DESC```)
  * Joint Range (array of floating point numbers, e.g., [0 23.4] formatted as ':0.00,23.40:') (```J_RANGE```)
  * Joint Units (string, e.g., 'deg','rad','mm') (```J_UNITS```)

### Specifics
* HRP-Compliance ACK frame
  - Q: ```:HRP:CA:``` -- A: ```:HRP:CA:```
* Get the robot information
  - Q: ```:HRP:G:R:INFO:``` -- A: ```:HRP:G:R:INFO:info_string:```
  - (info_string can be obtained with the function ```HRP.robotInfo2str(info)```
  - (the info can be converted to an object with the function ```HRP.str2robotInfo(str)```
* Get the joint information
  - Q: ```:HRP:G:J:INFO:``` -- A: ```:HRP:G:J:INFO:info_string:```
  - (info_string can be obtained with the function ```HRP.robotInfo2str(info)```
  - (the info can be converted to an object with the function ```HRP.str2robotInfo(str)```
* Get a joint value
  - Q: ```:HRP:G:J:V:id:``` -- A: ```:HRP:G:J:id:value:```
  - (id is an integer between 0 and 999, formatted as 000-999)
  - (value is a number with two decimal places. It must contain the two decimal places, as in 1.00)
* Get all joints values
  - Q: ```:HRP:GA:J:V:``` -- A: ```:HRP:GA:J:id1:value1: ... idn:valuen:```
* Set the end effector value (position)
  - Q: ```:HRP:S:EE:V:x_pos:y_pos:z_pos:``` -- A: ```:HRP:A:S:EE:V:```
  - (work TODO: set also the orientation)
* Set the end effector value (differential position)
  - Q: ```:HRP:S:EED:V:x_pos:y_pos:z_pos:``` -- A: ```:HRP:A:S:EED:V:```
  - (work TODO: set also the orientation)
* Set a joint value (position, angle, etc)
  - Q: ```:HRP:S:J:V:id:value:``` -- A: ```:HRP:A:S:J:V:id```
  - (id is an integer between 0 and 999, formatted as 000-999)
  - (value is a number with two decimal places. It must contain the two decimal places, as in 1.00)

### Example of information string
- Q: ```:HRP:G:R:INFO``` -- A: ```:HRP:G:R:INFO:B:MY_BRAND:M:MODEL_A:DOF:2:J:012,056:```
- Q: ```:HRP:G:J:INFO:012``` -- A: ```:HRP:G:J:INFO:012:J_TYPE:R:J_DESC:CC_MOTOR:J_RANGE:0.00,180.00:J_UNITS:deg:```
- Q: ```:HRP:G:J:INFO:056``` -- A: ```:HRP:G:J:INFO:056:J_TYPE:T:J_DESC:STEPPER_MOTOR:J_RANGE:0.00,20.00:J_UNITS:mm:```
 - The order of the fields are not important because they are stored in an object.
 
...to be continued

## Note
Version 0.1.0 will respond to this specification. Work in progress.

## See also
[hrp-server](https://github.com/andresmanelli/hrp-server)
[virtual-hrp-robot](https://github.com/andresmanelli/virtual-hrp-robot)
[hrp-joy-driver](https://github.com/andresmanelli/hrp-joy-driver)
