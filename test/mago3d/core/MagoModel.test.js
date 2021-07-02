/* eslint-disable strict */

describe("MagoModel", function () 
{
	var model;
    
	var mockModel = {};
	var mockSeed = new BuildingSeed();
	mockSeed.bBox = new BoundingBox();
	mockSeed.bBox.minX = 0;
	mockSeed.bBox.minY = 0;
	mockSeed.bBox.minZ = 0;
	mockSeed.bBox.maxX = 1;
	mockSeed.bBox.maxY = 1;
	mockSeed.bBox.maxZ = 1;
    
	describe('생성자 테스트 : ', function () 
	{
		it('객체 생성시 new 키워드 없이 생성할 경우 예외를 던져야 함', function () 
		{
            
			expect(function () 
			{
				model = MagoModel();
			}).toThrowError(Messages.CONSTRUCT_ERROR);
		});
		describe('필수속성이 없을 경우 : ', function () 
		{
			it('empty object', function () 
			{
				expect(function()
				{
					model = new MagoModel(mockModel);
				}).toThrowError(Messages.REQUIRED_EMPTY_ERROR('dataId'));
			});

			it('empty data group id', function () 
			{
				expect(function()
				{
					mockModel.dataId = 'abc';
					mockModel.dataKey = 'abc';
					model = new MagoModel(mockModel);
				}).toThrowError(Messages.REQUIRED_EMPTY_ERROR('dataGroupId'));
			});
			it('empty lon lat', function ()
			{
				expect(function()
				{
					mockModel.dataGroupId = 'abc';
					mockModel.dataKey = 'abc';
					model = new MagoModel(mockModel);
				}).toThrowError(Messages.REQUIRED_EMPTY_ERROR('longitude', 'latitude'));
			});
		});

		it('객체 생성시 제대로 값을 넣었을 때 값 확인', function () 
		{
			mockModel.longitude = 1;
			mockModel.latitude = 2;
			mockModel.altitude = 0;
			model = new MagoModel(mockModel, mockSeed);
			expect(model.id).toEqual('abc');
			expect(model.layerId).toEqual('abc');
			expect(model.geographicCoord.latitude).toEqual(2);
			expect(model.geographicCoord.longitude).toEqual(1);
			expect(model.geographicCoord.altitude).toEqual(0);
		});
	});
});