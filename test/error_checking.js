/**
 * Testing HRP for issues in functions arguments, etc
 */
var HRP = require('../hrp.js');
var VR = require('./virtualRobot.js')('./ScaraRobot.js');

describe('Testing the protocol for errors',function(){

	describe('When connecting to fake path',function(){
		var test = HRP('fake_path',null,false);
		
		it('should return the physical robot handler',function(){
			test.should.be.an('object');
			test.virtual.should.exist;
			test.virtual.should.be.false;
			test.port.should.exist;
			assert.equal(test.port,-1);
		});
		
		it('should return false to isHRP()',function(){
			return test.isHRP().should.eventually.be.false;
		});

		it('should return false if we try to connect',function(){
			test.connect().should.be.false;
		});

		describe('issuing a command to the robot',function(){
			it('should reject getRobotInfo()',function(){
				return test.getRobotInfo().should.be.rejected;
			});
		});
		
	});

	describe('Using virtual robot on port 5555',function(){
		var test = HRP('virtual',5555,false);

		it('should return the virtual robot handler',function(){
			test.should.be.an('object');
			test.virtual.should.exist;
			test.virtual.should.be.true;
			test.port.should.exist;
			expect(test.sock).to.not.exist;
			assert.equal(test.port,5555);
		});

		it('should return false if we try to connect two times',function(){
			expect(test.sock).to.not.exist;
			test.connect().should.be.true;
			expect(test.sock).to.exist;
			test.connected().should.equal(true);
			test.connect().should.be.false;
		});

		it('should return true when disconnecting',function(){
			test.connected().should.be.true;
			expect(test.sock).to.exist;
			test.disconnect().should.be.true;
			test.connected().should.be.false;
			expect(test.sock).to.not.exist;
		});

		it('should return false if we try to disconnect two times',function(){
			expect(test.sock).to.not.exist;
			test.connected().should.be.false;
			test.disconnect().should.be.false;
		});

		it('should return true to isHRP()',function(){
			return test.isHRP().should.eventually.be.true;
		});
	});

	describe('Using virutal robot on port 6666',function(){
		var test = HRP('virtual',6666,false);

		it('should return the virtual robot handler',function(){
			test.should.be.an('object');
			test.virtual.should.exist;
			test.virtual.should.be.true;
			test.port.should.exist;
			expect(test.sock).to.not.exist;
			assert.equal(test.port,6666);
		});

		it('should return false to isHRP()',function(){
			return test.isHRP().should.eventually.be.false;
		});

		it('should reject getRobotInfo()',function(){
			return test.getRobotInfo().should.be.rejected;
		});

		it('should reject setEEDifPos()',function(){
			return test.setEEDifPos().should.be.rejected;
		});

	});

	describe('Testing helper functions',function(){
		var test = HRP(null,null,true);

		it('check id should return false if null or undefined',function(){
			test.check_id(null).should.be.false;
			test.check_id().should.be.false;
		});
	});

	describe('Testing frames generation',function(){
		var test = HRP(null,null,true);

		it('GET_JOINT should return false if invalid id',function(){
			test.GET_JOINT().should.be.false;
			test.GET_JOINT(-1).should.be.false;
			test.GET_JOINT(1400).should.be.false;
		});

		it('SET_EE_DIF_POS tests',function(){
			test.SET_EE_DIF_POS([0,3,56.7]).should.equal(':HRP:S:EE:V:0.00:3.00:56.70:');
			test.SET_EE_DIF_POS([0.1,-3,-3.2]).should.equal(':HRP:S:EE:V:0.10:-3.00:-3.20:');
			test.SET_EE_DIF_POS([-0.0245,100.234,1.4]).should.equal(':HRP:S:EE:V:-0.02:100.23:1.40:');
		})

		it('SET_EE_DIF_POS should return false if invalid move',function(){
			test.SET_EE_DIF_POS('invalid',1.2).should.be.false;
			test.SET_EE_DIF_POS(1.2).should.be.false;
			test.SET_EE_DIF_POS([1.2]).should.be.false;
		});
	});
});