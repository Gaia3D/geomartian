'use strict';

/**
 * @class Water
 */
var Water = function(waterManager, options) 
{
	if (!(this instanceof Water)) 
	{
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

    this.waterManager = waterManager;

	this.geographicExtent;
	this.simulationResolution = waterManager.simulationTextureWidth;
	this.textureWidth = new Int32Array([waterManager.simulationTextureWidth]);
	this.textureHeight = new Int32Array([waterManager.simulationTextureHeight]);

	this.demTextureWidth = 512;
	this.demTextureHeight = 512;

	// simulation textures.
	this.terrainHeightTexA; // terrain DEM texture.
	this.terrainHeightTexB; // terrain DEM texture.

	this.waterHeightTexA; // water height over terrain.
	this.waterHeightTexB; // water height over terrain.

	// water source, contaminant source  & rain.*********************************************
	this.waterSourceTex;
	this.rainTex;
	this.contaminantSourceTex;

	this.waterFluxTexA_HIGH; // water fluxing in 4 directions. splitted values in high & low.
	this.waterFluxTexB_HIGH; // water fluxing in 4 directions. splitted values in high & low.
	this.waterFluxTexA_LOW; // water fluxing in 4 directions. splitted values in high & low.
	this.waterFluxTexB_LOW; // water fluxing in 4 directions. splitted values in high & low.

	this.waterVelocityTexA;
	this.waterVelocityTexB;

	// water particles.************************************************
	this.particlesTex_A;
	this.particlesTex_B;
	this.particlesPosTex_A;
	this.particlesPosTex_B;
	this.windRes;

	// contamination texture.******************************************
	this.contaminationTex_A;
	this.contaminationTex_B;

	// Shader log textures.********************************************
	this.shaderLogTexA; // auxiliar tex to debug shaders.***
	this.shaderLogTexB; // auxiliar tex to debug shaders.***

	this.shaderLogTex_Flux_A; // auxiliar tex to debug shaders.***
	this.shaderLogTex_Flux_B; // auxiliar tex to debug shaders.***

	// simulation parameters.******************************************
	//this.terrainMinMaxHeights = new Float32Array([180.0, 540.0]);
	this.terrainMinMaxHeights = new Float32Array([180.0, 540.0]);
	this.waterMaxHeight = 100.0; // ok.
	this.waterMaxFlux = 5000.0; // ok. (4000 is no enought).
	this.waterMaxVelocity = 40.0;
	this.contaminantMaxheight = -1.0;
	this.contaminantMaxheight = 50.0;

	this.simulationTimeStep = 0.25; // ok.
	//this.simulationTimeStep = 0.3; // 

	// The water renderable surface.
	this.surface; // tile size surface, with 512 x 512 points (as DEM texture size).

	// The buildings & objects intersected by this waterTile.
	this.visibleObjectsControler;

	if(options)
	{
		if(options.geographicExtent)
		{
			this.geographicExtent = options.geographicExtent;
		}
	}
};

Water.prototype.init = function ()
{
	this._makeSurface();
	this._makeTextures();

	// calculate the size of the tile in meters.***
	// Globe.getArcDistanceBetweenGeographicCoords = function(startGeoCoord, endGeoCoord)
	var minLon = this.geographicExtent.minGeographicCoord.longitude;
	var minLat = this.geographicExtent.minGeographicCoord.latitude;
	var maxLon = this.geographicExtent.maxGeographicCoord.longitude;
	var maxLat = this.geographicExtent.maxGeographicCoord.latitude;

	// in longitude direction.
	var geoCoord_leftDown = new GeographicCoord(minLon, minLat, 0);
	var geoCoord_leftUp = new GeographicCoord(minLon, maxLat, 0);
	var geoCoord_rightDown = new GeographicCoord(maxLon, minLat, 0);

	this.tileSizeMeters_x = Globe.getArcDistanceBetweenGeographicCoords(geoCoord_leftDown, geoCoord_rightDown);
	this.tileSizeMeters_y = Globe.getArcDistanceBetweenGeographicCoords(geoCoord_leftDown, geoCoord_leftUp);
};


Water.prototype._makeTextures = function ()
{
	var magoManager = this.waterManager.magoManager;
	var gl = magoManager.getGl();

	// water simulation texture size: it depends of waterManager.
	var texWidth = this.textureWidth[0];
	var texHeight = this.textureHeight[0];
	
	// make a heightMap and a fluxMap.
	this.waterHeightTexA = this.waterManager._newTexture(gl, texWidth, texHeight);
	this.waterHeightTexB = this.waterManager._newTexture(gl, texWidth, texHeight);

	this.waterHeightTexA.name = "A";
	this.waterHeightTexB.name = "B";

	this.waterFluxTexA_HIGH = this.waterManager._newTexture(gl, texWidth, texHeight);; // water fluxing in 4 directions. splitted values in high & low.
	this.waterFluxTexB_HIGH = this.waterManager._newTexture(gl, texWidth, texHeight);; // water fluxing in 4 directions. splitted values in high & low.
	this.waterFluxTexA_LOW = this.waterManager._newTexture(gl, texWidth, texHeight);; // water fluxing in 4 directions. splitted values in high & low.
	this.waterFluxTexB_LOW = this.waterManager._newTexture(gl, texWidth, texHeight);; // water fluxing in 4 directions. splitted values in high & low.
	
	this.waterVelocityTexA = this.waterManager._newTexture(gl, texWidth, texHeight);
	this.waterVelocityTexB = this.waterManager._newTexture(gl, texWidth, texHeight);

	this.demWithBuildingsTex = this.waterManager._newTexture(gl, texWidth, texHeight);
	
	// Shade Log textures.**********************************************************************************************************************
	this.shaderLogTexA = this.waterManager._newTexture(gl, texWidth, texHeight); // auxiliar tex to debug shaders. delete after use.
	this.shaderLogTexB = this.waterManager._newTexture(gl, texWidth, texHeight); // auxiliar tex to debug shaders. delete after use.

	this.shaderLogTex_Flux_A = this.waterManager._newTexture(gl, texWidth, texHeight); // auxiliar tex to debug shaders. delete after use.
	this.shaderLogTex_Flux_B = this.waterManager._newTexture(gl, texWidth, texHeight); // auxiliar tex to debug shaders. delete after use.

	// Particles.********************************************************************************************************************************
	// Now, inicialitze particles random position.
	var particlesTexWidth = this.waterManager.particlesRenderTexWidth;
	var particlesTexHeight = this.waterManager.particlesRenderTexHeight;
	this.particlesTex_A = this.waterManager._newTexture(gl, particlesTexWidth, particlesTexHeight);
	this.particlesTex_B = this.waterManager._newTexture(gl, particlesTexWidth, particlesTexHeight);
	var numParticles = this.windRes * this.windRes;
	var particleState = new Uint8Array(numParticles * 4);
	for (var i = 0; i < particleState.length; i++) 
	{
		particleState[i] = Math.floor(Math.random() * 256); // randomize the initial particle positions
	}
	this.particlesPosTex_A = new Texture();
	this.particlesPosTex_B = new Texture();
	this.particlesPosTex_A.texId = Texture.createTexture(gl, gl.NEAREST, particleState, this.windRes, this.windRes);
	this.particlesPosTex_B.texId = Texture.createTexture(gl, gl.NEAREST, particleState, this.windRes, this.windRes);

	// Contamination texture.*********************************************************************************************************************
	this.contaminationTex_A = this.waterManager._newTexture(gl, texWidth, texHeight);
	this.contaminationTex_B = this.waterManager._newTexture(gl, texWidth, texHeight);

	this.contaminantSourceTex = this.waterManager._newTexture(gl, texWidth, texHeight);

	gl.bindTexture(gl.TEXTURE_2D, null);
};

 /**
 * render
 */
Water.prototype.isPrepared = function()
{
	if(!this.surface)
	{ return false; }

	return true;
};

Water.prototype.prepareTextures = function ()
{
	// Water source texture.
	if(!this.waterSourceTex)
	{
		var magoManager = this.waterManager.magoManager;
		var gl = magoManager.getGl();

		// load test texture dem.
		this.waterSourceTex = new Texture();
		this.waterSourceTex.texId = gl.createTexture();
	}

	if (this.waterSourceTex.fileLoadState === CODE.fileLoadState.READY)
	{
		var magoManager = this.waterManager.magoManager;
		var gl = magoManager.getGl();
		var texturePath = '/images/en/waterSourceTexTestlow.png';
		//var texturePath = '/images/en/waterSourceTexTest_rain.png';
		//var texturePath = '/images/en/black.png';
		//var texturePath = '/images/en/contaminantHigh.png';

		ReaderWriter.loadImage(gl, texturePath, this.waterSourceTex);
		return false;
	}
	else if (this.waterSourceTex.fileLoadState === CODE.fileLoadState.BINDING_FINISHED)
	{
		var hola = 0; // debug to check. Delete this "if".
	}

	// Rain if exist.
	if(!this.rainTex)
	{
		var magoManager = this.waterManager.magoManager;
		var gl = magoManager.getGl();

		// load test texture dem.
		this.rainTex = new Texture();
		this.rainTex.texId = gl.createTexture();
	}

	if (this.rainTex.fileLoadState === CODE.fileLoadState.READY)
	{
		var magoManager = this.waterManager.magoManager;
		var gl = magoManager.getGl();
		var texturePath = '/images/en/waterSourceTexTest_rain.png';

		ReaderWriter.loadImage(gl, texturePath, this.rainTex);
		return false;
	}
	else if (this.rainTex.fileLoadState === CODE.fileLoadState.BINDING_FINISHED)
	{
		var hola = 0; // debug to check. Delete this "if".
	}

	// DEM texture.
	if(!this.dem_texture)
	{
		var magoManager = this.waterManager.magoManager;
		var gl = magoManager.getGl();

		// load test texture dem.
		this.dem_texture = new Texture();
		this.dem_texture.texId = gl.createTexture();
	}

	if (this.dem_texture.fileLoadState === CODE.fileLoadState.READY)
	{
		var magoManager = this.waterManager.magoManager;
		var gl = magoManager.getGl();
		var dem_texturePath = '/images/en/demSampleTest.png';

		ReaderWriter.loadImage(gl, dem_texturePath, this.dem_texture);
		return false;
	}
	else if (this.dem_texture.fileLoadState === CODE.fileLoadState.BINDING_FINISHED)
	{
		var hola = 0;
	}// waterTerrainDifusse

	// Terrain difusse texture.
	if(!this.terrainDiffTex)
	{
		var magoManager = this.waterManager.magoManager;
		var gl = magoManager.getGl();

		// load test texture dem.
		this.terrainDiffTex = new Texture();
		this.terrainDiffTex.texId = gl.createTexture();
	}

	if (this.terrainDiffTex.fileLoadState === CODE.fileLoadState.READY)
	{
		var magoManager = this.waterManager.magoManager;
		var gl = magoManager.getGl();
		var dem_texturePath = '/images/en/waterTerrainDifusse.png';
		//var dem_texturePath = '/images/en/waterTerrainDifusse_bw.png';

		ReaderWriter.loadImage(gl, dem_texturePath, this.terrainDiffTex);
		return false;
	}
	else if (this.terrainDiffTex.fileLoadState === CODE.fileLoadState.BINDING_FINISHED)
	{
		var hola = 0;
	}// 

	// contaminant texture.
	/*
	if(!this.contaminantSourceTex)
	{
		var magoManager = this.waterManager.magoManager;
		var gl = magoManager.getGl();

		// load test texture dem.
		this.contaminantSourceTex = new Texture();
		this.contaminantSourceTex.texId = gl.createTexture();
	}

	if (this.contaminantSourceTex.fileLoadState === CODE.fileLoadState.READY)
	{
		var magoManager = this.waterManager.magoManager;
		var gl = magoManager.getGl();
		var contaminant_texturePath = '/images/en/contaminant.png';
		//var contaminant_texturePath = '/images/en/contaminantHigh.png';
		//var contaminant_texturePath = '/images/en/black.png';

		ReaderWriter.loadImage(gl, contaminant_texturePath, this.contaminantSourceTex);
		return false;
	}
	else if (this.contaminantSourceTex.fileLoadState === CODE.fileLoadState.BINDING_FINISHED)
	{
		var hola = 0;
	}// 
	*/

	return true;
};

Water._swapTextures = function (texA, texB)
{
	var texAux = texA.texId;
	texA.texId = texB.texId;
	texB.texId = texAux;
};

/**
 * simulation
 */
Water.prototype.doSimulationSteps = function (magoManager)
{
	if(!this.waterHeightTexA)
	{
		return false;
	}

	if(!this.prepareTextures())
	{ return false; }

	var sceneState = magoManager.sceneState;
	var waterManager = this.waterManager;

	// bind frameBuffer.
	var gl = magoManager.getGl();
	//var extbuffers = magoManager.extbuffers;
	var fbo = this.waterManager.fbo;
	var extbuffers = fbo.extbuffers;
	var shader;

	gl.disable(gl.BLEND);
	gl.clearColor(0.0, 0.0, 0.0, 0.0);
	gl.clearDepth(1.0); 

	//---------------------------------------------------------------------------------------------------------------------------------
	// 1- Calculate water height by water source.**************************************************************************************
	fbo.bind();
	gl.viewport(0, 0, fbo.width[0], fbo.height[0]);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.waterHeightTexA.texId, 0); // depthTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, this.contaminationTex_A.texId, 0); // normalTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT2_WEBGL, gl.TEXTURE_2D, null, 0); // albedoTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT3_WEBGL, gl.TEXTURE_2D, null, 0); // .
	extbuffers.drawBuffersWEBGL([
		extbuffers.COLOR_ATTACHMENT0_WEBGL, // gl_FragData[0]
		extbuffers.COLOR_ATTACHMENT1_WEBGL, // gl_FragData[1]
		extbuffers.NONE, // gl_FragData[2]
		extbuffers.NONE, // gl_FragData[3]
		]);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var screenQuad = this.waterManager.getQuadBuffer();
	shader = magoManager.postFxShadersManager.getShader("waterCalculateHeight");
	magoManager.postFxShadersManager.useProgram(shader);
	gl.uniform1i(shader.u_existRain_loc, false);
	gl.uniform1f(shader.u_contaminantMaxHeigh_loc, this.contaminantMaxheight); // negative value -> no exist contaminat.

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, this.waterSourceTex.texId); // water source.

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, this.rainTex.texId); // rain.

	gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, this.waterHeightTexB.texId);

	if(this.contaminantMaxheight > 0.0)
	{
		gl.activeTexture(gl.TEXTURE3); // contaminant tex if exist.
		gl.bindTexture(gl.TEXTURE_2D, this.contaminantSourceTex.texId);

		gl.activeTexture(gl.TEXTURE4); // contaminant tex if exist.
		gl.bindTexture(gl.TEXTURE_2D, this.contaminationTex_B.texId);
	}

	// bind screenQuad positions.
	FBO.bindAttribute(gl, screenQuad.posBuffer, shader.a_pos, 2);
	//FBO.bindAttribute(gl, this.texCoordBuffer, shader.texCoord2_loc, 2);

	// Draw screenQuad:
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	// now, swap waterHeightTextures:
	//gl.bindFramebuffer(gl.FRAMEBUFFER,null);

	Water._swapTextures(this.waterHeightTexA, this.waterHeightTexB);
	Water._swapTextures(this.contaminationTex_A, this.contaminationTex_B);
		
	//----------------------------------------------------------------------------------------------------------------------------------
	// 2- Calculate the fluxMap by terrain dem & current waterHeight.*******************************************************************
	fbo.bind();
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.waterFluxTexA_HIGH.texId, 0); // depthTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, this.waterFluxTexA_LOW.texId, 0); // depthTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT2_WEBGL, gl.TEXTURE_2D, this.shaderLogTex_Flux_A.texId, 0); // depthTex.
	extbuffers.drawBuffersWEBGL([
		extbuffers.COLOR_ATTACHMENT0_WEBGL, // gl_FragData[0]
		extbuffers.COLOR_ATTACHMENT1_WEBGL, // gl_FragData[1]
		extbuffers.COLOR_ATTACHMENT2_WEBGL, // gl_FragData[2]
		extbuffers.NONE, // gl_FragData[3]
		]);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	shader = magoManager.postFxShadersManager.getShader("waterCalculateFlux");
	magoManager.postFxShadersManager.useProgram(shader);

	gl.uniform1f(shader.u_SimRes_loc, this.simulationResolution);
	gl.uniform2fv(shader.u_simulationTextureSize_loc, [waterManager.simulationTextureWidth, waterManager.simulationTextureHeight]);
	gl.uniform2fv(shader.u_terrainTextureSize_loc, [this.demTextureWidth, this.demTextureHeight]);

	gl.uniform1f(shader.u_timestep_loc, this.simulationTimeStep);
	gl.uniform2fv(shader.u_heightMap_MinMax_loc, this.terrainMinMaxHeights);
	gl.uniform1f(shader.u_waterMaxHeigh_loc, this.waterMaxHeight);
	gl.uniform1f(shader.u_waterMaxFlux_loc, this.waterMaxFlux);
	gl.uniform2fv(shader.u_tileSize_loc, [this.tileSizeMeters_x, this.tileSizeMeters_y]);
	gl.uniform1f(shader.u_contaminantMaxHeigh_loc, this.contaminantMaxheight); // negative value -> no exist contaminat.

	gl.activeTexture(gl.TEXTURE0); // water height tex.
	gl.bindTexture(gl.TEXTURE_2D, this.waterHeightTexB.texId);

	gl.activeTexture(gl.TEXTURE1); // terrain height tex.
	gl.bindTexture(gl.TEXTURE_2D,  this.demWithBuildingsTex.texId);

	gl.activeTexture(gl.TEXTURE2); // flux tex high.
	gl.bindTexture(gl.TEXTURE_2D, this.waterFluxTexB_HIGH.texId);

	gl.activeTexture(gl.TEXTURE3); // flux tex low.
	gl.bindTexture(gl.TEXTURE_2D, this.waterFluxTexB_LOW.texId);

	if(this.contaminantMaxheight > 0.0)
	{
		gl.activeTexture(gl.TEXTURE4); // contaminant tex if exist.
		gl.bindTexture(gl.TEXTURE_2D, this.contaminationTex_B.texId);
	}

	// bind screenQuad positions.
	FBO.bindAttribute(gl, screenQuad.posBuffer, shader.a_pos, 2);

	// Draw screenQuad:
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	// now, swap waterHeightTextures:
	Water._swapTextures(this.waterFluxTexA_HIGH, this.waterFluxTexB_HIGH);
	Water._swapTextures(this.waterFluxTexA_LOW, this.waterFluxTexB_LOW);
	Water._swapTextures(this.shaderLogTex_Flux_A, this.shaderLogTex_Flux_B);

	//----------------------------------------------------------------------------------------------------------------------------------------------
	// 3- calculate velocityMap & new height by height & flux maps.*********************************************************************************
	fbo.bind();
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.waterHeightTexA.texId, 0); // waterHeight
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, this.waterVelocityTexA.texId, 0); // waterVelocity.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT2_WEBGL, gl.TEXTURE_2D, this.contaminationTex_A.texId, 0);  // debug. delete after use.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT3_WEBGL, gl.TEXTURE_2D, null, 0); // 

	extbuffers.drawBuffersWEBGL([
		extbuffers.COLOR_ATTACHMENT0_WEBGL, // gl_FragData[0]
		extbuffers.COLOR_ATTACHMENT1_WEBGL, // gl_FragData[1]
		extbuffers.COLOR_ATTACHMENT2_WEBGL, // gl_FragData[2]
		extbuffers.NONE, // gl_FragData[3]
		]);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	shader = magoManager.postFxShadersManager.getShader("waterCalculateVelocity");
	magoManager.postFxShadersManager.useProgram(shader);

	gl.uniform1f(shader.u_SimRes_loc, this.simulationResolution);
	gl.uniform2fv(shader.u_simulationTextureSize_loc, [waterManager.simulationTextureWidth, waterManager.simulationTextureHeight]);
	gl.uniform2fv(shader.u_terrainTextureSize_loc, [this.demTextureWidth, this.demTextureHeight]);

	gl.uniform1f(shader.u_PipeLen_loc, 1.0); // pipeLen = cellSizeX = cellSizeY.
	gl.uniform1f(shader.u_timestep_loc, this.simulationTimeStep);
	gl.uniform1f(shader.u_PipeArea_loc, 0.8);
	gl.uniform2fv(shader.u_heightMap_MinMax_loc, this.terrainMinMaxHeights);
	gl.uniform1f(shader.u_waterMaxHeigh_loc, this.waterMaxHeight);
	gl.uniform1f(shader.u_waterMaxFlux_loc, this.waterMaxFlux);
	gl.uniform2fv(shader.u_tileSize_loc, [this.tileSizeMeters_x, this.tileSizeMeters_y]);
	gl.uniform1f(shader.u_waterMaxVelocity_loc, this.waterMaxVelocity);
	gl.uniform1f(shader.u_contaminantMaxHeigh_loc, this.contaminantMaxheight);

	gl.activeTexture(gl.TEXTURE0); // water height tex.
	gl.bindTexture(gl.TEXTURE_2D, this.waterHeightTexB.texId);

	gl.activeTexture(gl.TEXTURE1); // terrain height tex.
	gl.bindTexture(gl.TEXTURE_2D,  this.demWithBuildingsTex.texId);

	gl.activeTexture(gl.TEXTURE2); // flux tex high.
	gl.bindTexture(gl.TEXTURE_2D, this.waterFluxTexB_HIGH.texId);

	gl.activeTexture(gl.TEXTURE3); // flux tex low.
	gl.bindTexture(gl.TEXTURE_2D, this.waterFluxTexB_LOW.texId);

	if(this.contaminantMaxheight > 0.0)
	{
		gl.activeTexture(gl.TEXTURE4); // contaminant tex if exist.
		gl.bindTexture(gl.TEXTURE_2D, this.contaminationTex_B.texId);
	}

	// bind screenQuad positions.
	FBO.bindAttribute(gl, screenQuad.posBuffer, shader.a_pos, 2);

	// Draw screenQuad:
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	// now, swap waterHeightTextures:
	Water._swapTextures(this.waterHeightTexA, this.waterHeightTexB);
	Water._swapTextures(this.waterVelocityTexA, this.waterVelocityTexB);
	Water._swapTextures(this.contaminationTex_A, this.contaminationTex_B); // debug. delete after use.

	//-----------------------------------------------------------------------------------------------------------------------------------------------------
	// 4) calculate sediment, waterHeight & velocity by terrain & water heights map & velocity.************************************************************
	shader = magoManager.postFxShadersManager.getShader("waterCalculateSediment");

	//-----------------------------------------------------------------------------------------------------------------------------------------------------
	// 5) calculate contamination by terrain & water heights map & velocity.*******************************************************************
	shader = magoManager.postFxShadersManager.getShader("waterCalculateContamination");


	//-----------------------------------------------------------------------------------------------------------------------------------------------------
	// Once finished simulation, then calculate particles if necessary:
	this.doSimulationSteps_particles(magoManager);

	//-----------------------------------------------------------------------------------------------------------------------------------------------------
	// Must return to current frameBuffer. TODO:
	var hola = 0;

	for(var i=0; i<8; i++)
	{
		gl.activeTexture(gl.TEXTURE0+i); 
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, null, 0); // depthTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, null, 0); // normalTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT2_WEBGL, gl.TEXTURE_2D, null, 0); // albedoTex.
	extbuffers.drawBuffersWEBGL([
		extbuffers.COLOR_ATTACHMENT0_WEBGL, // gl_FragData[0]
		extbuffers.NONE, // gl_FragData[1]
		extbuffers.NONE, // gl_FragData[2]
		extbuffers.NONE, // gl_FragData[3]
		]);

};

/**
 * simulation
 */
Water.prototype.doSimulationSteps_particles = function (magoManager)
{
	// Use the velocity map of the water to render particles movement.
	var gl = magoManager.getGl();
	var fbo = this.waterManager.windParticlesPosFbo;
	var extbuffers = fbo.extbuffers;
	var screenQuad = this.waterManager.getQuadBuffer();
	var shader;
	fbo.bind();
	gl.viewport(0, 0, fbo.width[0], fbo.height[0]);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.particlesPosTex_A.texId, 0); // waterHeight
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, null, 0); // waterVelocity.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT2_WEBGL, gl.TEXTURE_2D, null, 0);  // debug. delete after use.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT3_WEBGL, gl.TEXTURE_2D, null, 0); // 
	
	extbuffers.drawBuffersWEBGL([
		extbuffers.COLOR_ATTACHMENT0_WEBGL, // gl_FragData[0]
		extbuffers.NONE, // gl_FragData[1]
		extbuffers.NONE, // gl_FragData[2]
		extbuffers.NONE, // gl_FragData[3]
		]);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	//-----------------------------------------------------------------------------------------------------------------------------------------------------
	// 1) Calculate particles position.********************************************************************************************************************
	shader = magoManager.postFxShadersManager.getShader("waterParticlesUpdate");
	magoManager.postFxShadersManager.useProgram(shader);

	var minGeoCoord = this.geographicExtent.minGeographicCoord;
	var maxGeoCoord = this.geographicExtent.maxGeographicCoord;

	gl.uniform1i(shader.u_flipTexCoordY_windMap_loc, true);
	gl.uniform2fv(shader.u_wind_res_loc, [this.windRes, this.windRes]);
	gl.uniform2fv(shader.u_wind_min_loc, [0.0, 0.0]); // provisional value.
	gl.uniform2fv(shader.u_wind_max_loc, [40.0, 40.0]); // provisional value.
	gl.uniform3fv(shader.u_geoCoordRadiansMax_loc, [maxGeoCoord.getLongitudeRad(), maxGeoCoord.getLatitudeRad(), 0.0]); 
	gl.uniform3fv(shader.u_geoCoordRadiansMin_loc, [minGeoCoord.getLongitudeRad(), minGeoCoord.getLatitudeRad(), 0.0]); 
	//gl.uniform1f(shader.u_speed_factor_loc, 0.2); // original.***
	gl.uniform1f(shader.u_speed_factor_loc, 0.1); // ok.
	gl.uniform1f(shader.u_drop_rate_loc, this.waterManager.dropRate);
	gl.uniform1f(shader.u_drop_rate_bump_loc, this.waterManager.dropRateBump);
	var randomSeed = Math.random();
	gl.uniform1f(shader.u_rand_seed_loc, randomSeed);

	gl.activeTexture(gl.TEXTURE0); // "u_particles"
	gl.bindTexture(gl.TEXTURE_2D, this.particlesPosTex_B.texId);

	gl.activeTexture(gl.TEXTURE1); // "u_wind"
	gl.bindTexture(gl.TEXTURE_2D,  this.waterVelocityTexB.texId);

	// bind screenQuad positions.
	gl.enableVertexAttribArray(shader.a_pos);
	FBO.bindAttribute(gl, screenQuad.posBuffer, shader.a_pos, 2);

	// Draw screenQuad:
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	Water._swapTextures(this.particlesPosTex_A, this.particlesPosTex_B);

	//-----------------------------------------------------------------------------------------------------------------------------------------------------
	// 2) Fade particles render.***************************************************************************************************************************
	
	fbo = this.waterManager.windParticlesRenderingFbo;
	fbo.bind();
	gl.viewport(0, 0, fbo.width[0], fbo.height[0]);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.particlesTex_A.texId, 0); // waterHeight
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, null, 0); // waterVelocity.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT2_WEBGL, gl.TEXTURE_2D, null, 0);  // debug. delete after use.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT3_WEBGL, gl.TEXTURE_2D, null, 0); // 
	
	extbuffers.drawBuffersWEBGL([
		extbuffers.COLOR_ATTACHMENT0_WEBGL, // gl_FragData[0]
		extbuffers.NONE, // gl_FragData[1]
		extbuffers.NONE, // gl_FragData[2]
		extbuffers.NONE, // gl_FragData[3]
		]);

	// NO clear : gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	shader = magoManager.postFxShadersManager.getShader("waterParticlesRenderFade");
	magoManager.postFxShadersManager.useProgram(shader);

	gl.uniform1f(shader.u_opacity_loc, 0.99);

	gl.activeTexture(gl.TEXTURE0); // "u_particles"
	gl.bindTexture(gl.TEXTURE_2D, this.particlesTex_B.texId);

	// bind screenQuad positions.
	gl.enableVertexAttribArray(shader.a_pos);
	FBO.bindAttribute(gl, screenQuad.posBuffer, shader.a_pos, 2);

	// Draw screenQuad:
	gl.drawArrays(gl.TRIANGLES, 0, 6);
		
	//-----------------------------------------------------------------------------------------------------------------------------------------------------
	// 3) Render particles.********************************************************************************************************************************
	
	fbo = this.waterManager.windParticlesRenderingFbo;
	extbuffers = fbo.extbuffers;
	fbo.bind();
	
	gl.viewport(0, 0, fbo.width[0], fbo.height[0]);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.particlesTex_A.texId, 0); // waterHeight
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, null, 0); // waterVelocity.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT2_WEBGL, gl.TEXTURE_2D, null, 0);  // debug. delete after use.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT3_WEBGL, gl.TEXTURE_2D, null, 0); // 
	
	extbuffers.drawBuffersWEBGL([
		extbuffers.COLOR_ATTACHMENT0_WEBGL, // gl_FragData[0]
		extbuffers.NONE, // gl_FragData[1]
		extbuffers.NONE, // gl_FragData[2]
		extbuffers.NONE, // gl_FragData[3]
		]);

	shader = magoManager.postFxShadersManager.getShader("waterParticlesRender");
	magoManager.postFxShadersManager.useProgram(shader);

	// NO clear : gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.activeTexture(gl.TEXTURE0); // "u_particles"
	gl.bindTexture(gl.TEXTURE_2D, this.particlesPosTex_B.texId);

	gl.activeTexture(gl.TEXTURE1); // "u_wind"
	gl.bindTexture(gl.TEXTURE_2D,  this.waterVelocityTexB.texId);

	// bind screenQuad positions.
	gl.enableVertexAttribArray(shader.a_index);
	FBO.bindAttribute(gl, this.waterManager.particleIndexBuffer, shader.a_index, 1);
	gl.uniform1i(shader.u_colorScale, false);
	
	gl.uniform1f(shader.u_particles_res, this.waterManager.windRes);
	gl.uniform2fv(shader.u_wind_min_loc, [0.0, 0.0]); // provisional value.
	gl.uniform2fv(shader.u_wind_max_loc, [40.0, 40.0]); // provisional value.
	gl.uniform1i(shader.u_flipTexCoordY_windMap, this.flipTexCoordsY_windMap);

	gl.drawArrays(gl.POINTS, 0, this.waterManager.numParticles);
		
	Water._swapTextures(this.particlesTex_A, this.particlesTex_B);
};

/**
 * simulation
 */
Water.prototype.doSimulationSteps_original = function (magoManager)
{
	if(!this.waterHeightTexA)
	{
		return false;
	}

	if(!this.prepareTextures())
	{ return false; }

	var sceneState = magoManager.sceneState;

	// bind frameBuffer.
	var gl = magoManager.getGl();
	//var extbuffers = magoManager.extbuffers;
	var fbo = this.waterManager.fbo;
	var extbuffers = fbo.extbuffers;
	var shader;
	
	gl.disable(gl.BLEND);
	gl.clearColor(0.0, 0.0, 0.0, 0.0);
	gl.clearDepth(1.0);
	//---------------------------------------------------------------------------------------------------------------------------------
	// 1- Calculate water height by water source.**************************************************************************************
	fbo.bind();
	gl.viewport(0, 0, fbo.width[0], fbo.height[0]);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.waterHeightTexA.texId, 0); // depthTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, null, 0); // normalTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT2_WEBGL, gl.TEXTURE_2D, null, 0); // albedoTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT3_WEBGL, gl.TEXTURE_2D, null, 0); // .
	extbuffers.drawBuffersWEBGL([
		extbuffers.COLOR_ATTACHMENT0_WEBGL, // gl_FragData[0]
		extbuffers.NONE, // gl_FragData[1]
		extbuffers.NONE, // gl_FragData[2]
		extbuffers.NONE, // gl_FragData[3]
		]);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var screenQuad = this.waterManager.getQuadBuffer();
	shader = magoManager.postFxShadersManager.getShader("waterCalculateHeight");
	magoManager.postFxShadersManager.useProgram(shader);

	gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.waterSourceTex.texId);

	gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, null);

	gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.waterHeightTexB.texId);

	// bind screenQuad positions.
	FBO.bindAttribute(gl, screenQuad.posBuffer, shader.a_pos, 2);
	//FBO.bindAttribute(gl, this.texCoordBuffer, shader.texCoord2_loc, 2);

	// Draw screenQuad:
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	// now, swap waterHeightTextures:
	//gl.bindFramebuffer(gl.FRAMEBUFFER,null);
	
	Water._swapTextures(this.waterHeightTexA, this.waterHeightTexB);
		
	
	//----------------------------------------------------------------------------------------------------------------------------------
	// 2- Calculate the fluxMap by terrain dem & current waterHeight.*******************************************************************
	fbo.bind();
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.waterFluxTexA.texId, 0); // depthTex.
	extbuffers.drawBuffersWEBGL([
		extbuffers.COLOR_ATTACHMENT0_WEBGL, // gl_FragData[0]
		extbuffers.NONE, // gl_FragData[1]
		extbuffers.NONE, // gl_FragData[2]
		extbuffers.NONE, // gl_FragData[3]
		]);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	shader = magoManager.postFxShadersManager.getShader("waterCalculateFlux");
	magoManager.postFxShadersManager.useProgram(shader);

	gl.uniform1f(shader.u_SimRes_loc, this.simulationResolution);
	gl.uniform1f(shader.u_PipeLen_loc, 1.0); // pipeLen = cellSizeX = cellSizeY.
	gl.uniform1f(shader.u_timestep_loc, this.simulationTimeStep);
	gl.uniform1f(shader.u_PipeArea_loc, 0.8);
	gl.uniform2fv(shader.u_heightMap_MinMax_loc, this.terrainMinMaxHeights);
	gl.uniform1f(shader.u_waterMaxHeigh_loc, this.waterMaxHeight);
	gl.uniform1f(shader.u_waterMaxFlux_loc, this.waterMaxFlux);
	gl.uniform2fv(shader.u_tileSize_loc, [this.tileSizeMeters_x, this.tileSizeMeters_y]);
	
	gl.activeTexture(gl.TEXTURE0); // water height tex.
    gl.bindTexture(gl.TEXTURE_2D, this.waterHeightTexB.texId);

	gl.activeTexture(gl.TEXTURE1); // terrain height tex.
    //gl.bindTexture(gl.TEXTURE_2D,  this.dem_texture.texId); // original.***
	gl.bindTexture(gl.TEXTURE_2D,  this.demWithBuildingsTex.texId);

	gl.activeTexture(gl.TEXTURE2); // flux tex.
    gl.bindTexture(gl.TEXTURE_2D, this.waterFluxTexB.texId);

	// bind screenQuad positions.
	FBO.bindAttribute(gl, screenQuad.posBuffer, shader.a_pos, 2);

	// Draw screenQuad:
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	// now, swap waterHeightTextures:
	Water._swapTextures(this.waterFluxTexA, this.waterFluxTexB);

	//----------------------------------------------------------------------------------------------------------------------------------------------
	// 3- calculate velocityMap & new height by height & flux maps.*********************************************************************************
	fbo.bind();
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.waterHeightTexA.texId, 0); // waterHeight
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, this.waterVelocityTexA.texId, 0); // waterVelocity.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT2_WEBGL, gl.TEXTURE_2D, null, 0); // 
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT3_WEBGL, gl.TEXTURE_2D, null, 0); // 
	
	extbuffers.drawBuffersWEBGL([
		extbuffers.COLOR_ATTACHMENT0_WEBGL, // gl_FragData[0]
		extbuffers.COLOR_ATTACHMENT1_WEBGL, // gl_FragData[1]
		extbuffers.NONE, // gl_FragData[2]
		extbuffers.NONE, // gl_FragData[3]
		]);

	//gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	shader = magoManager.postFxShadersManager.getShader("waterCalculateVelocity");
	magoManager.postFxShadersManager.useProgram(shader);

	gl.uniform1f(shader.u_SimRes_loc, this.simulationResolution);
	gl.uniform1f(shader.u_PipeLen_loc, 1.0); // pipeLen = cellSizeX = cellSizeY.
	gl.uniform1f(shader.u_timestep_loc, this.simulationTimeStep);
	gl.uniform1f(shader.u_PipeArea_loc, 0.8);
	gl.uniform2fv(shader.u_heightMap_MinMax_loc, this.terrainMinMaxHeights);
	gl.uniform1f(shader.u_waterMaxHeigh_loc, this.waterMaxHeight);
	gl.uniform1f(shader.u_waterMaxFlux_loc, this.waterMaxFlux);
	gl.uniform2fv(shader.u_tileSize_loc, [this.tileSizeMeters_x, this.tileSizeMeters_y]);
	
	gl.activeTexture(gl.TEXTURE0); // water height tex.
	gl.bindTexture(gl.TEXTURE_2D, this.waterHeightTexB.texId);

	gl.activeTexture(gl.TEXTURE1); // terrain height tex.
	gl.bindTexture(gl.TEXTURE_2D,  this.demWithBuildingsTex.texId);

	gl.activeTexture(gl.TEXTURE2); // flux tex.
	gl.bindTexture(gl.TEXTURE_2D, this.waterFluxTexB.texId);

	// bind screenQuad positions.
	FBO.bindAttribute(gl, screenQuad.posBuffer, shader.a_pos, 2);

	// Draw screenQuad:
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	// now, swap waterHeightTextures:
	Water._swapTextures(this.waterHeightTexA, this.waterHeightTexB);
	Water._swapTextures(this.waterVelocityTexA, this.waterVelocityTexB);

	//-----------------------------------------------------------------------------------------------------------------------------------------------------
	// 4) calculate sediment, waterHeight & velocity by terrain & water heights map & velocity.************************************************************
	shader = magoManager.postFxShadersManager.getShader("waterCalculateSediment");
		
	//-----------------------------------------------------------------------------------------------------------------------------------------------------
	// Must return to current frameBuffer. TODO:
	var hola = 0;

	for(var i=0; i<8; i++)
	{
		gl.activeTexture(gl.TEXTURE0+i); 
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, null, 0); // depthTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, null, 0); // normalTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT2_WEBGL, gl.TEXTURE_2D, null, 0); // albedoTex.
	extbuffers.drawBuffersWEBGL([
		extbuffers.COLOR_ATTACHMENT0_WEBGL, // gl_FragData[0]
		extbuffers.NONE, // gl_FragData[1]
		extbuffers.NONE, // gl_FragData[2]
		extbuffers.NONE, // gl_FragData[3]
		]);

};

Water.prototype.renderTerrain = function (shader, magoManager)
{
	// This is a provisional function. The terrain must be rendered by cesium.
	if(!this.isPrepared())
	{
		this.init();
		return;
	}

	if(!this.prepareTextures())
	{ return false; }

	var waterManager = this.waterManager;
	var sceneState = magoManager.sceneState;
	var currShader = magoManager.postFxShadersManager.getShader("terrainRender");
	magoManager.postFxShadersManager.useProgram(currShader);
	currShader.bindUniformGenerals();

	// make the vboKey:*****************************************************************************
	if (this.vbo_vicks_container === undefined)
	{ 
		this.vbo_vicks_container = new VBOVertexIdxCacheKeysContainer(); 
		var vboCacheKey = this.vbo_vicks_container.newVBOVertexIdxCacheKey();
		vboCacheKey.setDataArrayPos(this.posBuffer, magoManager.vboMemoryManager);
		vboCacheKey.setDataArrayTexCoord(this.texCoordBuffer, magoManager.vboMemoryManager);
	}

	var gl = magoManager.getGl();

	gl.uniform3fv(currShader.buildingPosHIGH_loc, this.terrainPositionHIGH);
	gl.uniform3fv(currShader.buildingPosLOW_loc, this.terrainPositionLOW);
	gl.uniformMatrix4fv(shader.buildingRotMatrix_loc, false, this.buildingGeoLocMat._floatArrays);
	gl.uniform2fv(currShader.u_heightMap_MinMax_loc, this.terrainMinMaxHeights);
	gl.uniform2fv(shader.u_tileSize_loc, [this.tileSizeMeters_x, this.tileSizeMeters_y]);
	gl.uniform2fv(shader.u_simulationTextureSize_loc, [waterManager.simulationTextureWidth, waterManager.simulationTextureHeight]);
	gl.uniform1i(shader.uFrustumIdx_loc, magoManager.currentFrustumIdx);

	gl.uniform1f(currShader.u_SimRes_loc, 512);
	gl.uniform2fv(currShader.u_screenSize_loc, [sceneState.drawingBufferWidth[0], sceneState.drawingBufferHeight[0]]);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, this.waterHeightTexA.texId);

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, this.dem_texture.texId);

	gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, this.terrainDiffTex.texId);

	var vbo_vicky = this.vbo_vicks_container.vboCacheKeysArray[0]; // there are only one.
	var vertices_count = vbo_vicky.vertexCount;
	if (!vbo_vicky.bindDataPosition(currShader, magoManager.vboMemoryManager))
	{ return false; }
	
	//if (!vbo_vicky.bindDataNormal(currShader, magoManager.vboMemoryManager))
	//{ return false; }

	if (!vbo_vicky.bindDataTexCoord(currShader, magoManager.vboMemoryManager))
	{ return false; }

	gl.drawArrays(gl.TRIANGLES, 0, vertices_count);

	var gl = magoManager.getGl();
	var hola = 0;
};

Water.prototype.renderWaterDepth = function (shader, magoManager)
{
	// render depth of the water.
	if(!this.isPrepared())
	{
		this.init();
		return;
	}

	if(!this.prepareTextures())
	{ return false; }

	// make the vboKey:*****************************************************************************
	if (this.vbo_vicks_container === undefined)
	{ 
		this.vbo_vicks_container = new VBOVertexIdxCacheKeysContainer(); 
		var vboCacheKey = this.vbo_vicks_container.newVBOVertexIdxCacheKey();
		vboCacheKey.setDataArrayPos(this.posBuffer, magoManager.vboMemoryManager);
		vboCacheKey.setDataArrayTexCoord(this.texCoordBuffer, magoManager.vboMemoryManager);
	}

	var gl = magoManager.getGl();

	gl.uniform3fv(shader.buildingPosHIGH_loc, this.terrainPositionHIGH);
	gl.uniform3fv(shader.buildingPosLOW_loc, this.terrainPositionLOW);
	gl.uniform2fv(shader.u_heightMap_MinMax_loc, this.terrainMinMaxHeights);
	gl.uniform1f(shader.u_waterMaxHeigh_loc, this.waterMaxHeight);
	gl.uniform1f(shader.u_contaminantMaxHeigh_loc, this.contaminantMaxheight);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, this.waterHeightTexA.texId);

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, this.demWithBuildingsTex.texId);//dem_texture//demWithBuildingsTex

	if(this.contaminantMaxheight > 0.0)
	{
		gl.activeTexture(gl.TEXTURE2); // contaminant tex if exist.
		gl.bindTexture(gl.TEXTURE_2D, this.contaminationTex_B.texId);
	}

	if(this.contaminantMaxheight > 0.0)
	{
		gl.activeTexture(gl.TEXTURE2); // contaminant tex if exist.
		gl.bindTexture(gl.TEXTURE_2D, this.contaminationTex_B.texId);
	}

	var vbo_vicky = this.vbo_vicks_container.vboCacheKeysArray[0]; // there are only one.
	var vertices_count = vbo_vicky.vertexCount;
	if (!vbo_vicky.bindDataPosition(shader, magoManager.vboMemoryManager))
	{ return false; }
	
	//if (!vbo_vicky.bindDataNormal(shader, magoManager.vboMemoryManager))
	//{ return false; }

	if (!vbo_vicky.bindDataTexCoord(shader, magoManager.vboMemoryManager))
	{ return false; }
	
	gl.disable(gl.BLEND); // depth render NO blending.

	gl.drawArrays(gl.TRIANGLES, 0, vertices_count);

};

Water.prototype.doIntersectedObjectsCulling = function (visiblesArray, nativeVisiblesArray)
{
	// this function does a frustumCulling-like process.
	// This function collects all objects inside of "this.distance" of this light position.
	if(!this.cullingUpdatedTime)
	this.cullingUpdatedTime = 0;

	var visiblesCount = 0;
	var nativeVisiblesCount = 0;

	if(visiblesArray)
	visiblesCount = visiblesArray.length;

	if(nativeVisiblesArray)
	nativeVisiblesCount = nativeVisiblesArray.length;

	//if(visiblesCount === 0 && nativeVisiblesCount === 0)
	//return;
	if(!this._BSphereWC)
	{
		var magoManager = this.waterManager.magoManager;
		this._BSphereWC = SmartTile.computeSphereExtent(magoManager, this.geographicExtent.minGeographicCoord, this.geographicExtent.maxGeographicCoord, undefined);
	}

	if(!this.visibleObjectsControler)
	{
		// create a visible objects controler.
		this.visibleObjectsControler = new VisibleObjectsController();
	}

	

	// visiblesObjects (nodes).
	var node;
	var bSphereWC;
	for(var i=0; i<visiblesCount; i++)
	{
		node = visiblesArray[i];
		bSphereWC = node.getBoundingSphereWC(bSphereWC);

		if(this._BSphereWC.intersectionSphere(bSphereWC) !== Constant.INTERSECTION_OUTSIDE)
		{
			this.visibleObjectsControler.currentVisibles0.push(node);
		}
	}

	// nativeVisiblesObjects.
	var native;
	for(var i=0; i<nativeVisiblesCount; i++)
	{
		native = nativeVisiblesArray[i];
		bSphereWC = native.getBoundingSphereWC(bSphereWC);

		if(this._BSphereWC.intersectionSphere(bSphereWC) !== Constant.INTERSECTION_OUTSIDE)
		{
			this.visibleObjectsControler.currentVisibleNativeObjects.opaquesArray.push(native);
		}
	}

	this.bIntersectionCulling = true;
	//this.bCubeMapMade = false;

	return true;
};

Water.prototype.getTileOrthographic_mvpMat = function ()
{
	if (!this.tileOrthoModelViewProjMatrix)
	{
		// Calculate the mvp matrix.***********************************************************************************************
		//var depthFactor = 10.0;
		var minLon = this.geographicExtent.minGeographicCoord.longitude;
		var minLat = this.geographicExtent.minGeographicCoord.latitude;
		var minAlt = this.terrainMinMaxHeights[0];

		var maxLon = this.geographicExtent.maxGeographicCoord.longitude;
		var maxLat = this.geographicExtent.maxGeographicCoord.latitude;
		var maxAlt = this.terrainMinMaxHeights[1];

		var midLon = (minLon + maxLon) / 2.0;
		var midLat = (minLat + maxLat) / 2.0;
		var midAlt = (minAlt + maxAlt) / 2.0;

		var lonRange = maxLon - minLon;
		var latRange = maxLat - minLat;
		var altRange = maxAlt - minAlt;
		
		var left = -lonRange / 2.0;
		var right = lonRange / 2.0;
		var bottom = -latRange / 2.0;
		var top = latRange / 2.0;
		var near = -altRange / 2.0;
		var far = altRange / 2.0;
		//var nRange = light.directionalBoxWidth/2;
		//var left = -nRange, right = nRange, bottom = -nRange, top = nRange, near = -depthFactor*nRange, far = depthFactor*nRange;
		var ortho = new Matrix4();
		ortho._floatArrays = glMatrix.mat4.ortho(ortho._floatArrays, left, right, bottom, top, near*1.0, far*1.0);

		// The modelView matrix is a NO rotation matrix, centered in the midle of the tile.
		var tMat = new Matrix4();
		tMat.setTranslation(midLon, midLat, midAlt);

		var modelView = new Matrix4();
		modelView._floatArrays = glMatrix.mat4.invert(modelView._floatArrays, tMat._floatArrays);

		// Now, calculate modelViewProjectionMatrix.
		// modelViewProjection.***
		this.tileOrthoModelViewProjMatrix = new Matrix4();
		this.tileOrthoModelViewProjMatrix = modelView.getMultipliedByMatrix(ortho, this.tileOrthoModelViewProjMatrix);
	}

	return this.tileOrthoModelViewProjMatrix;
};



Water.prototype.makeContaminationSourceTex = function (magoManager)
{
	// render extrudeObjects depth over the DEM depth texture.
	if(!this.isPrepared())
	{
		this.init();
		return;
	}

	if(!this.prepareTextures())
	{ return false; }

	var modelViewProjMatrix = this.getTileOrthographic_mvpMat();

	var screenQuad = this.waterManager.getQuadBuffer();
	var gl = magoManager.getGl();
	var fbo = this.waterManager.fbo; // simulation fbo. (512 x 512).
	var extbuffers = fbo.extbuffers;
	var shader;

	gl.disable(gl.BLEND);
	gl.clearColor(0.0, 0.0, 0.0, 0.0);
	gl.clearDepth(1.0);
	

	// *********************************************************************************************************************************************
	fbo.bind();
	gl.viewport(0, 0, fbo.width[0], fbo.height[0]);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.contaminantSourceTex.texId, 0); // depthTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, null, 0); // normalTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT2_WEBGL, gl.TEXTURE_2D, null, 0); // albedoTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT3_WEBGL, gl.TEXTURE_2D, null, 0); // .
	extbuffers.drawBuffersWEBGL([
		extbuffers.COLOR_ATTACHMENT0_WEBGL, // gl_FragData[0]
		extbuffers.NONE, // gl_FragData[1]
		extbuffers.NONE, // gl_FragData[2]
		extbuffers.NONE, // gl_FragData[3]
		]);

	if (magoManager.isFarestFrustum())
	{
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  
	}
		
	// 1rst, create a local coords system:
	// the center of the water tile is origin.
	shader = magoManager.postFxShadersManager.getShader("waterOrthogonalContamination");
	magoManager.postFxShadersManager.useProgram(shader);
	shader.bindUniformGenerals();

	gl.uniformMatrix4fv(shader.u_modelViewProjectionMatrix_loc, false, modelViewProjMatrix._floatArrays);
	gl.uniform3fv(shader.aditionalMov_loc, [0.0, 0.0, 0.0]); //.***
	gl.uniform4fv(shader.u_color4_loc, [0.0, 0.5, 0.6, 1.0]); //.***
	gl.disable(gl.CULL_FACE);
	if (magoManager.isFarestFrustum())
	{ gl.clear(gl.DEPTH_BUFFER_BIT); }

	var renderType = 0;
	var refMatrixIdxKey = 0;
	var glPrimitive = undefined;

	var contaminationBoxesArray = this.waterManager.getContaminationObjectsArray(); 
	var contaminantObjectsCount = contaminationBoxesArray.length;

	for(var i=0; i<contaminantObjectsCount; i++)
	{
		var native = contaminationBoxesArray[i];
		native.render(magoManager, shader, renderType, glPrimitive);
	}

	gl.enable(gl.CULL_FACE);
};

Water.prototype.overWriteDEMWithObjects = function (shader, magoManager)
{
	// render extrudeObjects depth over the DEM depth texture.
	if (!this.visibleObjectsControler)
	{
		return;
	}

	if(!this.isPrepared())
	{
		this.init();
		return;
	}

	if(!this.prepareTextures())
	{ return false; }

	var visibleNodesCount = this.visibleObjectsControler.currentVisibles0.length;

	var modelViewProjMatrix = this.getTileOrthographic_mvpMat();

	var waterManager = this.waterManager;
	var screenQuad = this.waterManager.getQuadBuffer();
	var gl = magoManager.getGl();
	var fbo = this.waterManager.fbo; // simulation fbo. (512 x 512).
	var extbuffers = fbo.extbuffers;
	var shader;

	gl.disable(gl.BLEND);
	gl.clearColor(1.0, 0.0, 0.0, 0.0);
	gl.clearDepth(1.0);
	

	// 1rst, copy the terrain depth into "this.demWithBuildingsTex".************************************************************************************
	fbo.bind();
	gl.viewport(0, 0, fbo.width[0], fbo.height[0]);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.demWithBuildingsTex.texId, 0); // depthTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, this.shaderLogTexA.texId, 0); // normalTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT2_WEBGL, gl.TEXTURE_2D, null, 0); // albedoTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT3_WEBGL, gl.TEXTURE_2D, null, 0); // .
	extbuffers.drawBuffersWEBGL([
		extbuffers.COLOR_ATTACHMENT0_WEBGL, // gl_FragData[0]
		extbuffers.COLOR_ATTACHMENT1_WEBGL, // gl_FragData[1]
		extbuffers.NONE, // gl_FragData[2]
		extbuffers.NONE, // gl_FragData[3]
		]);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, this.dem_texture.texId);  // original.***
		
	if (magoManager.isFarestFrustum())
	{ 
		//gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 

		shader = magoManager.postFxShadersManager.getShader("waterCopyTexture");
		magoManager.postFxShadersManager.useProgram(shader);
		shader.bindUniformGenerals();

		gl.uniform1i(shader.u_textureFlipYAxis_loc, true);

		// bind screenQuad positions.
		FBO.bindAttribute(gl, screenQuad.posBuffer, shader.a_pos, 2);

		// Draw screenQuad:
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	// 2n, make building depth over terrain depth.******************************************************************************************************

	// 1rst, create a local coords system:
	// the center of the water tile is origin.
	shader = magoManager.postFxShadersManager.getShader("waterOrthogonalDepthRender");
	magoManager.postFxShadersManager.useProgram(shader);
	shader.bindUniformGenerals();

	gl.uniformMatrix4fv(shader.u_modelViewProjectionMatrix_loc, false, modelViewProjMatrix._floatArrays);
	gl.uniform3fv(shader.aditionalMov_loc, [0.0, 0.0, 0.0]); //.***
	gl.uniform4fv(shader.u_color4_loc, [1.0, 0.0, 0.0, 1.0]); //.***
	gl.uniform2fv(shader.u_heightMap_MinMax_loc, this.terrainMinMaxHeights);
	gl.uniform2fv(shader.u_simulationTextureSize_loc, [waterManager.simulationTextureWidth, waterManager.simulationTextureHeight]);
	
	gl.disable(gl.CULL_FACE);
	gl.clear(gl.DEPTH_BUFFER_BIT);

	var renderType = 0;
	var refMatrixIdxKey = 0;
	var glPrimitive = undefined;
	
	for(var i=0; i<visibleNodesCount; i++)
	{
		var node = this.visibleObjectsControler.currentVisibles0[i];
		node.renderContent(magoManager, shader, renderType, refMatrixIdxKey);
	}

	var visibleNativesOpaquesCount = this.visibleObjectsControler.currentVisibleNativeObjects.opaquesArray.length;
	for(var i=0; i<visibleNativesOpaquesCount; i++)
	{
		var native = this.visibleObjectsControler.currentVisibleNativeObjects.opaquesArray[i];
		if (native.name !== "contaminationGenerator")
		{ native.render(magoManager, shader, renderType, glPrimitive); }

		//if(i > 2)
		//break;
	}

	var visibleNativesTransparentsCount = this.visibleObjectsControler.currentVisibleNativeObjects.transparentsArray.length;
	for(var i=0; i<visibleNativesTransparentsCount; i++)
	{
		var native = this.visibleObjectsControler.currentVisibleNativeObjects.transparentsArray[i];
		if (native.name !== "contaminationGenerator")
		{ native.render(magoManager, shader, renderType, glPrimitive); }
	}
	
	gl.enable(gl.CULL_FACE);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, null); 
};

/**
 * render
 */
Water.prototype.renderWater = function (shader, magoManager)
{
	if(!this.isPrepared())
	{
		this.init();
		return;
	}

	if(!this.prepareTextures())
	{ return false; }

	var waterManager = this.waterManager;

	// make the vboKey:*****************************************************************************
	if (this.vbo_vicks_container === undefined)
	{ 
		this.vbo_vicks_container = new VBOVertexIdxCacheKeysContainer(); 
		var vboCacheKey = this.vbo_vicks_container.newVBOVertexIdxCacheKey();
		vboCacheKey.setDataArrayPos(this.posBuffer, magoManager.vboMemoryManager);
		vboCacheKey.setDataArrayTexCoord(this.texCoordBuffer, magoManager.vboMemoryManager);
	}

	var gl = magoManager.getGl();
	var sceneState = this.waterManager.magoManager.sceneState;
	// note: shader uniformGenerals binded at waterManager.
	gl.uniform3fv(shader.buildingPosHIGH_loc, this.terrainPositionHIGH);
	gl.uniform3fv(shader.buildingPosLOW_loc, this.terrainPositionLOW);
	gl.uniformMatrix4fv(shader.buildingRotMatrix_loc, false, this.buildingGeoLocMat._floatArrays);
	gl.uniform2fv(shader.u_heightMap_MinMax_loc, this.terrainMinMaxHeights);
	gl.uniform2fv(shader.u_screenSize_loc, [sceneState.drawingBufferWidth[0], sceneState.drawingBufferHeight[0]]);
	gl.uniform1i(shader.uWaterType_loc, 3); // 0 = waterColor., 1 = water-flux, 2 = water-velocity, 3= particles.
	gl.uniform1f(shader.u_waterMaxHeigh_loc, this.waterMaxHeight);
	gl.uniform1f(shader.u_contaminantMaxHeigh_loc, this.contaminantMaxheight);
	gl.uniform2fv(shader.u_tileSize_loc, [this.tileSizeMeters_x, this.tileSizeMeters_y]);
	gl.uniform2fv(shader.u_simulationTextureSize_loc, [waterManager.simulationTextureWidth, waterManager.simulationTextureHeight]);

	var projectionMatrixInv = sceneState.getProjectionMatrixInv();
  	gl.uniformMatrix4fv(shader.projectionMatrixInv_loc, false, projectionMatrixInv._floatArrays);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, this.waterManager.depthTex.texId);  // original.***

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, this.waterHeightTexA.texId);

	gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, this.demWithBuildingsTex.texId);//dem_texture//demWithBuildingsTex

	gl.activeTexture(gl.TEXTURE3);
	gl.bindTexture(gl.TEXTURE_2D, this.particlesTex_A.texId);// waterFluxTexA, waterVelocityTexA, particlesTex_A

	if(this.contaminantMaxheight > 0.0)
	{
		gl.activeTexture(gl.TEXTURE4); // contaminant tex if exist.
		gl.bindTexture(gl.TEXTURE_2D, this.contaminationTex_B.texId);
	}


	var vbo_vicky = this.vbo_vicks_container.vboCacheKeysArray[0]; // there are only one.
	var vertices_count = vbo_vicky.vertexCount;
	if (!vbo_vicky.bindDataPosition(shader, magoManager.vboMemoryManager))
	{ return false; }
	
	//if (!vbo_vicky.bindDataNormal(shader, magoManager.vboMemoryManager))
	//{ return false; }

	if (!vbo_vicky.bindDataTexCoord(shader, magoManager.vboMemoryManager))
	{ return false; }
	gl.enable(gl.BLEND);
	gl.drawArrays(gl.TRIANGLES, 0, vertices_count);

	gl.disable(gl.BLEND);
};

Water.prototype._makeSurface = function ()
{
	// CRS84.***
	var lonSegments = this.waterManager.simulationTextureWidth;
	var latSegments = this.waterManager.simulationTextureHeight;

	var altitude = 0;

	// This function makes an ellipsoidal mesh for tiles that has no elevation data.
	//********************************************************************************
	// Note: In waterTiles, make trianglesArray, no use drawElemets, use drawArray.
	//--------------------------------------------------------------------------------
	var degToRadFactor = Math.PI/180.0;
	var minLon = this.geographicExtent.minGeographicCoord.longitude * degToRadFactor;
	var minLat = this.geographicExtent.minGeographicCoord.latitude * degToRadFactor;
	var maxLon = this.geographicExtent.maxGeographicCoord.longitude * degToRadFactor;
	var maxLat = this.geographicExtent.maxGeographicCoord.latitude * degToRadFactor;
	var lonRange = maxLon - minLon;
	var latRange = maxLat - minLat;
	var depth = this.depth;
	
	var lonIncreDeg = lonRange/lonSegments;
	var latIncreDeg = latRange/latSegments;
	
	// calculate total verticesCount.
	var vertexCount = (lonSegments + 1)*(latSegments + 1);
	//var lonArray = new Float32Array(vertexCount);
	//var latArray = new Float32Array(vertexCount);
	//var altArray = new Float32Array(vertexCount);

	var lonArray = new Array(vertexCount);
	var latArray = new Array(vertexCount);
	var altArray = new Array(vertexCount);

	this.texCoordsArray = new Float32Array(vertexCount*2);
	
	var currLon = minLon; // init startLon.
	var currLat = minLat; // init startLat.
	var idx = 0;
	var s, t;

	
	// check if exist altitude.
	var alt = 0;
	if (altitude)
	{ alt = altitude; }
	
	for (var currLatSeg = 0; currLatSeg<latSegments+1; currLatSeg++)
	{
		currLat = minLat + latIncreDeg * currLatSeg;
		if (currLat > maxLat)
		{ currLat = maxLat; }
		
		
		for (var currLonSeg = 0; currLonSeg<lonSegments+1; currLonSeg++)
		{
			currLon = minLon + lonIncreDeg * currLonSeg;
			
			if (currLon > maxLon)
			{ currLon = maxLon; }
			
			lonArray[idx] = currLon;
			latArray[idx] = currLat;
			// Now set the altitude.
			altArray[idx] = alt;


			// make texcoords CRS84.***
			s = (currLon - minLon)/lonRange;
			t = (currLat - minLat)/latRange;
			
			this.texCoordsArray[idx*2] = s;
			this.texCoordsArray[idx*2+1] = t;
			
			// actualize current values.
			idx++;
		}
	}

	if(!this.cartesiansArray)
	{
		var coordsCount = lonArray.length;
		this.cartesiansArray = new Array(coordsCount);
	}
	
	this.cartesiansArray = Globe.geographicRadianArrayToFloat32ArrayWgs84(lonArray, latArray, altArray, this.cartesiansArray);
	
	// Make normals using the cartesians.***
	this.normalsArray = new Int8Array(vertexCount*3);
	var point = new Point3D();
	for (var i=0; i<vertexCount; i++)
	{
		point.set(this.cartesiansArray[i*3], this.cartesiansArray[i*3+1], this.cartesiansArray[i*3+2]);
		point.unitary();
		
		this.normalsArray[i*3] = point.x*126;
		this.normalsArray[i*3+1] = point.y*126;
		this.normalsArray[i*3+2] = point.z*126;
	}
	
	// finally make indicesArray.
	var numCols = lonSegments + 1;
	var numRows = latSegments + 1;
	var options = {
		bCalculateBorderIndices: true,
		indicesByteSize : 4 // In this case (waterTiles) must calculate indices in Uint32, because here vertexCount is greater than max_shortSize..
	};
	var resultObject = GeometryUtils.getIndicesTrianglesRegularNet(numCols, numRows, undefined, undefined, undefined, undefined, undefined, options);
	this.indices = resultObject.indicesArray;
	this.southIndices = resultObject.southIndicesArray;
	this.eastIndices = resultObject.eastIndicesArray;
	this.northIndices = resultObject.northIndicesArray;
	this.westIndices = resultObject.westIndicesArray;
	
	this.westVertexCount = this.westIndices.length;
	this.southVertexCount = this.southIndices.length;
	this.eastVertexCount = this.eastIndices.length;
	this.northVertexCount = this.northIndices.length;

	// Now, calculate the centerPosition of the waterTile.***
	var altitude = 0.0;
	var resultGeographicCoord;
	resultGeographicCoord = this.geographicExtent.getMidPoint(resultGeographicCoord);
	
	var centerLon = resultGeographicCoord.longitude;
	var centerLat = resultGeographicCoord.latitude;
	
	var resultCartesian;
	resultCartesian = Globe.geographicToCartesianWgs84(centerLon, centerLat, altitude, resultCartesian);
	
	// Float64Array.
	this.centerX = new Float64Array([resultCartesian[0]]);
	this.centerY = new Float64Array([resultCartesian[1]]);
	this.centerZ = new Float64Array([resultCartesian[2]]);

	// Now, make the trianglesArray.*****************************************************************************
	var indicesCount = this.indices.length;
	var posBuffer = new Float32Array(indicesCount * 3);
	var texCoordBuffer = new Float32Array(indicesCount * 2);
	var idx;
	for(var i=0; i<indicesCount; i++)
	{
		idx = this.indices[i];
		posBuffer[i*3] = this.cartesiansArray[idx*3] - this.centerX[0];
		posBuffer[i*3+1] = this.cartesiansArray[idx*3+1] - this.centerY[0];
		posBuffer[i*3+2] = this.cartesiansArray[idx*3+2] - this.centerZ[0];

		texCoordBuffer[i*2] = this.texCoordsArray[idx*2];
		texCoordBuffer[i*2+1] = this.texCoordsArray[idx*2+1];
	}

	this.surface = true;
	this.posBuffer = posBuffer;
	this.texCoordBuffer = texCoordBuffer;

	// now, calculate terrainPositionHIGH & terrainPositionLOW.
	if (this.terrainPositionHIGH === undefined)
	{ this.terrainPositionHIGH = new Float32Array(3); }

	if (this.terrainPositionLOW === undefined)
	{ this.terrainPositionLOW = new Float32Array(3); }
	ManagerUtils.calculateSplited3fv([this.centerX[0], this.centerY[0], this.centerZ[0]], this.terrainPositionHIGH, this.terrainPositionLOW);

	// Now, calculate the buildingRotMatrix. This matrix is the tMat at cartesian point. This matrix will be used to
	// calculate the normal from highMaps. So, calculate the tMat at the middle of the tile.
	this.buildingGeoLocMat = new Matrix4(); // Only rotations.
	this.buildingGeoLocMat._floatArrays = Globe.transformMatrixAtCartesianPointWgs84(this.centerX[0], this.centerY[0], this.centerZ[0], this.buildingGeoLocMat._floatArrays);
	this.buildingGeoLocMat._floatArrays[12] = 0.0; // Only rotations.
	this.buildingGeoLocMat._floatArrays[13] = 0.0; // Only rotations.
	this.buildingGeoLocMat._floatArrays[14] = 0.0; // Only rotations.
};