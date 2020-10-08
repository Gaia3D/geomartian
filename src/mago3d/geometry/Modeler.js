
'use strict';


/**
 * 파라미터로 이루어진 데이터를 표출하기 위해 관리하는 클래스.
 * @class Modeler
 * @constructor
 */
var Modeler = function(magoManager) 
{
	if (!(this instanceof Modeler)) 
	{
		throw new Error(Messages.CONSTRUCT_ERROR);
	}
	Emitter.call(this);
	this.magoManager = magoManager;
	
	/*
	 * Current modeler's mode. 
	 * @type {Enumeration}
	 * @default CODE.modelerMode.INACTIVE
	 */
	this.mode = CODE.modelerMode.INACTIVE; // test for the moment.
	this.drawingState = CODE.modelerDrawingState.NO_STARTED; // test for the moment.
	this.drawingElement = CODE.modelerDrawingElement.NOTHING; // test for the moment.
	
	// Test objects.***
	this.planeGrid; // sketch plane.
	this.polyLine2d; // current polyline2D to sketch.
	this.geoCoordsList; // class: GeographicCoordsList. geographic polyline.
	this.excavation; // class : Excavation.
	this.tunnel; // class : Tunnel.
	this.bSplineCubic3d;
	this.sphere; // class : Sphere.
	this.clippingBox;
	this.magoRectangle;
	
	this.testObjectsArray;
	
	this.objectsArray = []; // put here all objects.***
	this.vectorsArray; // put here vector objects (lines, polylines, etc.).***
	this.currentVisibleObjectsArray;

	// screenSpaceObjectsArray.***
	this.screenSpaceObjectsArray = [];
	
};
Modeler.EVENT_TYPE = {
	'ADD' : 'add'
}

Modeler.prototype = Object.create(Emitter.prototype);
Modeler.prototype.constructor = Modeler;

Modeler.prototype.extractObjectsByClassName = function(className, resultObjectsArray) 
{
	if (this.objectsArray === undefined)
	{ return resultObjectsArray; }
	
	if (resultObjectsArray === undefined)
	{ resultObjectsArray = []; }
	
	var objectsCount = this.objectsArray.length;
	for (var i=0; i<objectsCount; i++)
	{
		var object = this.objectsArray[i];
		if (object.constructor.name === className)
		{
			resultObjectsArray.push(object);
		}
	}
	
	return resultObjectsArray;
};

Modeler.prototype.newPipe = function(options) 
{
	var interiorRadius = options.interiorRadius;
	var exteriorRadius = options.exteriorRadius;
	var height = options.height;
	
	var pipe = new Pipe(interiorRadius, exteriorRadius, height, options);
	
	if (this.objectsArray === undefined)
	{ this.objectsArray = []; }
	
	this.objectsArray.push(pipe);
	return pipe;
};

Modeler.prototype.newTube = function(options) 
{
	var interiorRadius = options.interiorRadius;
	var exteriorRadius = options.exteriorRadius;
	var height = options.height;
	
	var tube = new Tube(interiorRadius, exteriorRadius, height, options);
	
	if (this.objectsArray === undefined)
	{ this.objectsArray = []; }
	
	this.objectsArray.push(tube);
	return tube;
};

/**
 * 모델러에 그려야할 객체 추가
 * @param {MagoRenderable} object
 * @param {number} depth Optional. 설정 시 해당 depth로 targetDepth 설정, targetDepth부터 화면에 나타남.
 */
Modeler.prototype.addObject = function(object, depth) 
{
	if (this.objectsArray === undefined)
	{ this.objectsArray = []; }

	// Check object's style.
	if (object instanceof MagoRectangle)
	{
		var style = object.style;
		if (style && style.clampToTerrain)
		{
			// put this object into tinTerrainManager.
			this.magoManager.tinTerrainManager.addObjectToClampToTerrain(object);
			return;
		}
	}

	this.objectsArray.push(object);
	
	var smartTileManager = this.magoManager.smartTileManager;
	// Note: the targetDepth must be calculated by the objects bbox size.
	var targetDepth = depth ? depth : 5;
	smartTileManager.putObject(targetDepth, object, this.magoManager);

	if (object.isNeedValidHeight(this.magoManager)) { this.magoManager._needValidHeightNativeArray.push(object); }

	this.emit(Modeler.EVENT_TYPE.ADD, {
		type :Modeler.EVENT_TYPE.ADD,
		timestamp : new Date().getTime(),
		add : object
	});
};

/**
 * 모델러에 객체 존재여부 반환
 * @param {MagoRenderable} object
 * @return {boolean} 
 */
Modeler.prototype.existObject = function(object)
{
	if (!this.objectsArray || (Array.isArray(this.objectsArray) && this.objectsArray.length === 0))
	{ return false; }

	// Check object's style.
	if (object instanceof MagoRectangle)
	{
		var style = object.style;
		if (style && style.clampToTerrain)
		{
			var find = this.magoManager.tinTerrainManager.objectsToClampToTerrainArray.filter(function(obj)
			{
				return obj !== object;
			});
			
			return find.length > 0;
		}
	}

	var find = this.objectsArray.filter(function(obj)
	{
		return obj !== object;
	});

	return find.length > 0;
};

/**
 * 모델러에 등록된 객체 삭제
 * @param {Object}
 */
Modeler.prototype.removeObject = function(target) 
{
	if (target === undefined)
	{ return false; }

	if (target instanceof MagoRectangle && target.style.clampToTerrain) 
	{
		this.magoManager.tinTerrainManager.removeObjectToClampToTerrain(target);
		target.deleteObjects(this.magoManager.vboMemoryManager);
		return;
	}
	target.deleteObjects(this.magoManager.vboMemoryManager);

	var tile = target.smartTileOwner;
	if (tile)
	{
		tile.nativeObjects.opaquesArray = tile.nativeObjects.opaquesArray.filter(function(opaq)
		{
			return opaq !== target;
		});
		
		tile.nativeObjects.transparentsArray = tile.nativeObjects.transparentsArray.filter(function(t)
		{
			return t !== target;
		});
	}
	
	this.objectsArray = this.objectsArray.filter(function(object)
	{
		return object !== target;
	});
};

/**
 * MagoRenderable 객체의 guid를 비교하여 같은 모델을 반환
 * @param {string} guid
 * @return {MagoRenderable}
 */
Modeler.prototype.getObjectByGuid = function(guid) {
	var model = this.objectsArray.filter(function(object)
	{
		return object._guid === guid;
	});

	return model[0];
}

/**
 * MagoRenderable 객체의 key/value를 비교하여 같은 모델을 반환
 * @param {string} key
 * @param {string} value
 * @return {Array<MagoRenderable>}
 */
Modeler.prototype.getObjectByKV = function(key, value) {
	var model = this.objectsArray.filter(function(object)
	{
		return object[key] === value;
	});

	return model;
}

Modeler.prototype.newPerson = function(options) 
{
	if (this.testObjectsArray === undefined)
	{ this.testObjectsArray = []; }
	
	var person = new AnimatedPerson();
	this.testObjectsArray.push(person);
	return person;
};

Modeler.prototype.newBasicFactory = function(factoryWidth, factoryLength, factoryHeight, options) 
{
	// set material for the roof of the factory.
	var magoManager = this.magoManager;
	var materialsManager = magoManager.materialsManager;
	var materialName = "basicFactoryRoof";
	var material = materialsManager.getOrNewMaterial(materialName);
	if (material.diffuseTexture === undefined)
	{ 
		material.diffuseTexture = new Texture(); 
		material.diffuseTexture.textureTypeName = "diffuse";
		material.diffuseTexture.textureImageFileName = "factoryRoof.jpg"; // Gaia3dLogo.png
		var imagesPath = materialsManager.imagesPath + "//" + material.diffuseTexture.textureImageFileName;
		var flipYTexCoord = true;
		TexturesManager.loadTexture(imagesPath, material.diffuseTexture, magoManager, flipYTexCoord);
	}
	
	// add options.
	if (options === undefined)
	{ options = {}; }
	
	options.roof = {
		"material": material
	};
	
	
	var basicFactory = new BasicFactory(factoryWidth, factoryLength, factoryHeight, options);
	basicFactory.bHasGround = true;
	
	if (this.objectsArray === undefined)
	{ this.objectsArray = []; }
	
	this.objectsArray.push(basicFactory);
	
	return basicFactory;
};

Modeler.getExtrudedSolidMesh = function(profile2d, extrusionDist, extrudeSegmentsCount, extrusionVector, bIncludeBottomCap, bIncludeTopCap, resultMesh) 
{
	if (profile2d === undefined || extrusionDist === undefined)
	{ return undefined; }
	
	var vtxProfilesList = new VtxProfilesList();
	
	// if want caps in the extruded mesh, must calculate "ConvexFacesIndicesData" of the profile2d before creating vtxProfiles.
	vtxProfilesList.convexFacesIndicesData = profile2d.getConvexFacesIndicesData(undefined);
	
	// create vtxProfiles.
	// make the base-vtxProfile.
	var baseVtxProfile = vtxProfilesList.newVtxProfile();
	baseVtxProfile.makeByProfile2D(profile2d);
	
	if (extrusionVector === undefined)
	{ extrusionVector = new Point3D(0, 0, 1); }
	
	var increDist = extrusionDist/extrudeSegmentsCount;
	for (var i=0; i<extrudeSegmentsCount; i++)
	{
		// test with a 1 segment extrusion.
		var nextVtxProfile = vtxProfilesList.newVtxProfile();
		nextVtxProfile.copyFrom(baseVtxProfile);
		nextVtxProfile.translate(0, 0, increDist*(i+1));
	}
	
	// must separate vbo groups by surfaces.
	resultMesh = vtxProfilesList.getMesh(resultMesh, bIncludeBottomCap, bIncludeTopCap);
	resultMesh.calculateVerticesNormals();
	
	return resultMesh;
};

Modeler.getExtrudedMesh = function(profile2d, extrusionDist, extrudeSegmentsCount, extrusionVector, bIncludeBottomCap, bIncludeTopCap, resultMesh) 
{
	if (profile2d === undefined || extrusionDist === undefined)
	{ return undefined; }

	var solidMesh = Modeler.getExtrudedSolidMesh(profile2d, extrusionDist, extrudeSegmentsCount, extrusionVector, undefined);
	resultMesh = solidMesh.getCopySurfaceIndependentMesh(resultMesh);
	resultMesh.calculateVerticesNormals();
	
	return resultMesh;
};

Modeler.getRevolvedSolidMesh = function(profile2d, revolveAngDeg, revolveSegmentsCount, revolveSegment2d, bIncludeBottomCap, bIncludeTopCap, resultMesh) 
{
	// Note: move this function into "VtxProfilesList" class.
	if (profile2d === undefined)
	{ return undefined; }

	var vtxProfilesList = new VtxProfilesList(); 
	
	// if want caps in the extruded mesh, must calculate "ConvexFacesIndicesData" of the profile2d before creating vtxProfiles.
	vtxProfilesList.convexFacesIndicesData = profile2d.getConvexFacesIndicesData(undefined);
	//profile2d.checkNormals();
	// create vtxProfiles.
	// make the base-vtxProfile.
	var baseVtxProfile = vtxProfilesList.newVtxProfile();
	baseVtxProfile.makeByProfile2D(profile2d);
	
	var increAngDeg = revolveAngDeg/revolveSegmentsCount;
	
	// calculate the translation.
	var line2d = revolveSegment2d.getLine();
	var origin2d = new Point2D(0, 0);
	var translationVector = line2d.getProjectedPoint(origin2d);
	translationVector.inverse();
	
	var rotMat = new Matrix4();
	var quaternion = new Quaternion();
	var rotAxis2d = revolveSegment2d.getDirection();
	var rotAxis = new Point3D(rotAxis2d.x, rotAxis2d.y, 0);
	rotAxis.unitary();
	
	for (var i=0; i<revolveSegmentsCount; i++)
	{
		// calculate rotation.
		quaternion.rotationAngDeg(increAngDeg*(i+1), rotAxis.x, rotAxis.y, rotAxis.z);
		rotMat.rotationByQuaternion(quaternion);
		
		// test top profile.
		var nextVtxProfile = vtxProfilesList.newVtxProfile();
		nextVtxProfile.copyFrom(baseVtxProfile);
		nextVtxProfile.translate(translationVector.x, translationVector.y, 0);
		nextVtxProfile.transformPointsByMatrix4(rotMat);
		nextVtxProfile.translate(-translationVector.x, -translationVector.y, 0);
	}
	
	resultMesh = vtxProfilesList.getMesh(resultMesh, bIncludeBottomCap, bIncludeTopCap);
	resultMesh.calculateVerticesNormals();
	
	return resultMesh;
};

Modeler.getPoints3DList_fromPoints3dArray = function(points3dArray, resultPoints3dList, options) 
{
	// 1rst, calculate the center point of the array.
	var bbox = new BoundingBox();
	bbox.init(points3dArray[0]);
	bbox.addPointsArray(points3dArray);
	
	// calculate the centerPos.
	var centerPos = bbox.getCenterPoint();
	
	// calculate geoLocationData.
	var geoLocData;
	
	// check options.
	if (options !== undefined && options.geoLocationData !== undefined)
	{
		// use the existent geoLocationData.
		geoLocData = options.geoLocationData;
	}
	else
	{
		// calculate geoLocationData by the centerPos of bbox.
		var geoCoord = ManagerUtils.pointToGeographicCoord(centerPos, undefined);
		geoLocData = ManagerUtils.calculateGeoLocationData(geoCoord.longitude, geoCoord.latitude, geoCoord.altitude, 0, 0, 0, undefined);
	}
	
	// calculate points3d relatives to the geoLocData.
	var relPoitsArray = geoLocData.getTransformedRelativePositionsArray(points3dArray, undefined);
	
	if (resultPoints3dList === undefined)
	{ resultPoints3dList = new Point3DList(); }
	
	resultPoints3dList.pointsArray = relPoitsArray;
	
	if (resultPoints3dList.geoLocDataManager === undefined)
	{ resultPoints3dList.geoLocDataManager = new GeoLocationDataManager(); }
	
	resultPoints3dList.geoLocDataManager.addGeoLocationData(geoLocData);
	return resultPoints3dList;
};

Modeler.prototype.getGeographicCoordsList = function() 
{
	if (this.geoCoordsList === undefined)
	{ this.geoCoordsList = new GeographicCoordsList(); }
	
	return this.geoCoordsList;
};

Modeler.prototype.getExcavation = function() 
{
	//if (this.excavation === undefined)
	//{ this.excavation = new Excavation(); }
	
	return this.excavation;
};

Modeler.prototype.getTunnel = function() 
{
	//if (this.tunnel === undefined)
	//{ this.tunnel = new Tunnel(); }
	
	return this.tunnel;
};

Modeler.prototype.addPointToPolyline = function(point2d) 
{
	if (this.polyLine2d === undefined)
	{ this.polyLine2d = new PolyLine2D(); }
	
	this.polyLine2d.newPoint2d(point2d.x, point2d.y);
};


Modeler.prototype.render = function(magoManager, shader, renderType, glPrimitive) 
{
	// Generic objects.***
	// The generic objects are into smartTiles, so is rendered when smartTile is visible on camera.
	
	// Render test objects.
	if (this.testObjectsArray !== undefined)
	{
		var testObjectsCount = this.testObjectsArray.length;
		for (var i=0; i<testObjectsCount; i++)
		{
			var testObject = this.testObjectsArray[i];
			testObject.render(magoManager);
		}
	}
	
	// 1rst, render the planeGrid if exist.
	if (this.planeGrid !== undefined)
	{
		this.planeGrid.render(magoManager, shader);
	}
	
	if (this.geoCoordsList !== undefined && renderType === 1)
	{
		// Provisionally render geographicPoints.
		if (this.geoCoordsList.points3dList !== undefined && this.geoCoordsList.points3dList.vboKeysContainer !== undefined)
		{
			//magoManager.clearCanvas2D();
			
			var bEnableDepth = true;
			var options = {};
			var thickLineShader = magoManager.postFxShadersManager.getShader("thickLine"); 
			thickLineShader.useProgram();
			
			// bind building geoLocationData.
			
			
			var gl = this.magoManager.getGl();
			gl.uniform1i(thickLineShader.bUseLogarithmicDepth_loc, magoManager.postFxShadersManager.bUseLogarithmicDepth);
			var sceneState = this.magoManager.sceneState;
			gl.uniform4fv(thickLineShader.oneColor4_loc, [0.9, 0.5, 0.3, 1.0]);
			gl.uniform2fv(thickLineShader.viewport_loc, [sceneState.drawingBufferWidth, sceneState.drawingBufferHeight]);
			gl.uniform1f(thickLineShader.thickness_loc, 5.0);
			this.geoCoordsList.points3dList.renderThickLines(magoManager, thickLineShader, renderType, bEnableDepth, options);
			
			shader.useProgram();
		}
		this.geoCoordsList.renderPoints(magoManager, shader, renderType);
	}
	
	if (this.excavation !== undefined)
	{
		this.excavation.renderPoints(magoManager, shader, renderType);
	}
	
	if (this.tunnel !== undefined)
	{
		this.tunnel.renderPoints(magoManager, shader, renderType);
	}
		
	if (renderType === 1 || renderType === 2)
	{
		if (this.clippingBox !== undefined)
		{
			var glPrimitive = undefined;
			var bIsSelected = false;
			this.clippingBox.render(magoManager, shader, renderType, glPrimitive, bIsSelected);
		}
	}
	
	if (this.bSplineCubic3d !== undefined)
	{
		if (renderType === 0)
		{
			shader = magoManager.postFxShadersManager.getShader("pointsCloudDepth");
			shader.useProgram();
			shader.disableVertexAttribArrayAll();
			shader.resetLastBuffersBinded();
			shader.enableVertexAttribArray(shader.position3_loc);
			shader.bindUniformGenerals();
		
			//gl.uniform1i(shader.bPositionCompressed_loc, false);
		}
		this.bSplineCubic3d.render(magoManager, shader, renderType);
	}
	
	if (this.sphere !== undefined)
	{
		this.sphere.render(magoManager, shader, renderType);
	}
	
	if (renderType === 0)
	{ return; }
	
	if (this.magoRectangle) 
	{
		this.magoRectangle.render(magoManager, shader, renderType, glPrimitive, bIsSelected);
	}
	
};

Modeler.prototype.createPlaneGrid = function(width, height, numCols, numRows) 
{
	// Test function.
	if (width === undefined)
	{ width = 500.0; }
	
	if (height === undefined)
	{ height = 500.0; }
	
	if (numCols === undefined)
	{ numCols = 50; }
	
	if (numRows === undefined)
	{ numRows = 50; }
	
	if (this.planeGrid === undefined)
	{
		this.planeGrid = new PlaneGrid(width, height, numCols, numRows);
	}
};