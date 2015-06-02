var HRP = require('../hrp.js');
var key;


describe('Testing basic existance of the components of HRP',function(){

	describe('When calling HRP with (null,null,true) - Only DEFS',function(){

		var test = HRP(null,null,true);

		it('should be an object',function(){
			expect(test).to.be.a('object');
		});
		
		it('should contain the keys defined in defs',function(){
			expect(test).to.contain.all.keys(defs);
		});

		it('should contain the keys defined in frames',function(){
			expect(test).to.contain.all.keys(frames);
		});

		it('should contain the keys defined in frame_parts',function(){
			expect(test).to.contain.all.keys(frame_parts);
		});

		it('should not contain the keys defined in protocol',function(){
			expect(test).to.not.contain.any.keys(protocol);
		});

	});

	describe('When calling HRP with virtual path and no port',function(){

		var test = HRP('virtual',null,false);

		it('should return false',function(){		
			assert.equal(test,false);
		});
	});

	describe('When calling HRP with virtual path and port (5555)',function(){

		var test = HRP('virtual',5555,false);

		it('path should be \'virtual\'',function(){		
			assert.equal(test.path,'virtual');
		});

		it('port should be 5555',function(){		
			assert.equal(test.port,5555);
		});

		it('virtual should be true',function(){		
			assert.equal(test.virtual,true);
		});

		it('should contain the keys defined in defs',function(){
			expect(test).to.contain.all.keys(defs);
		});

		it('should contain the keys defined in frames',function(){
			expect(test).to.contain.all.keys(frames);
		});

		it('should contain the keys defined in frame_parts',function(){
			expect(test).to.contain.all.keys(frame_parts);
		});

		it('should contain the keys defined in protocol',function(){
			expect(test).to.contain.all.keys(protocol);
		});

	});

	describe('When calling HRP with (some_path,null,false)',function(){

		var test = HRP('not_real_path',null,false);

		it('should not be virtual',function(){
			assert.equal(test.virtual,false);
		});

		it('port should be -1',function(){
			assert.equal(test.port,-1);
		});

		it('should have path set to not_real_path',function(){
			assert.equal(test.path,'not_real_path');
		});

		it('should contain the keys defined in defs',function(){
			expect(test).to.contain.all.keys(defs);
		});

		it('should contain the keys defined in protocol',function(){
			expect(test).to.contain.all.keys(protocol);
		});

	});
});