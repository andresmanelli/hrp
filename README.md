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
* Every frame must start with ```:HRP:```
* The isssued command follows the preamble
  * Get: ```G:```
  * Set: ```S:```
  * Get All: ```GA:```
  * Set All: ```SA:```
* The target device follows the command
  * Robot: ```R:```  
  * Joint(s): ```J:```
  * End Effector: ```EE:```
* The target property follows the device
  * Info: ```INFO:```
  * Value: ```V:```
* The robot must ACK the received _Set_ command even if it can not complete the operation (e.g., move the end effector to desired position)
* The robot must not ACK the received _Get_ command, it should only send the requested information
  * ACK: ```A:```
  * Compilance ACK: ```CA:```

### Specifics
* HRP-Compilance ACK frame
  - Q: ```:HRP:CA:``` -- A: ```:HRP:CA```
* Get the robot information
  - Q: ```:HRP:G:R:INFO:``` -- A: ```:HRP:R:INFO:info_string:```
  - (info_string can be obtained with the function ```HRP.robotInfo2str(info)```
  - (the info can be converted to an object with the function ```HRP.str2robotInfo(str)```
* Get a joint value
  - Q: ```:HRP:G:J:V:id:``` -- A: ```:HRP:J:id:value:```
  - (id is an integer between 0 and 999, formatted as 000-999)
  - (value is a number with two decimal places. It must contain the two decimal places, as in 1.00)
* Get all joints values
  - Q: ```:HRP:GA:J:V:``` -- A: ```:HRP:J:id1:value1: ... idn:valuen:```

...to be continued

## Note
Version 0.1.0 will respond to this specification. Work in progress.
