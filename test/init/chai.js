var chai = require('chai');
global.sinon = require('sinon');
var sinonChai = require("sinon-chai");
var chaiAsPromised = require("chai-as-promised");
var Promise = require('es6-promise').Promise;

chai.use(sinonChai);
chai.use(chaiAsPromised);

chai.config.includeStack = true;
 
global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.assert = chai.assert;
global.should = chai.should();