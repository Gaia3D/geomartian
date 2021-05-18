'use strict';

/**
 * @class WaterManager
 */
var WaterManager = function(magoManager) 
{
	if (!(this instanceof WaterManager)) 
	{
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

    // https://github.com/LanLou123/Webgl-Erosion
	// https://cgg.mff.cuni.cz/~jaroslav/papers/2008-sca-erosim/2008-sca-erosiom-fin.pdf

    this.waterLayersArray = [];
    this.magoManager = magoManager;

	this.fbo;

	// Simulation parameters.**************************************************************************
	//this.simulationTextureWidth = 1024;
	//this.simulationTextureHeight = 1024;

	this.simulationTextureWidth = 512; // limited by DEM texture size
	this.simulationTextureHeight = 512;

	// Water wind.*************************************************************************************
	this.windParticlesPosFbo;
	this.windRes = 64;
	this.dropRate = 0.003; // how often the particles move to a random place
	this.dropRateBump = 0.001; // drop rate increase relative to individual particle speed
	//-------------------------------------------------------------------------------------------------

    this.createDefaultShaders();
	this.init();
};

/**
 * render
 */
WaterManager.prototype.newWater = function (options)
{
	var water = new Water(this, options);
	water.windRes = this.windRes;
	this.waterLayersArray.push(water);
	return water;
};

WaterManager.prototype.init = function ()
{
	/*
	var bufferWidth = this.sceneState.drawingBufferWidth[0];
	var bufferHeight = this.sceneState.drawingBufferHeight[0];
	var bUseMultiRenderTarget = this.postFxShadersManager.bUseMultiRenderTarget;
	this.texturesManager.lBuffer = new FBO(gl, bufferWidth, bufferHeight, {matchCanvasSize: true, multiRenderTarget : bUseMultiRenderTarget, numColorBuffers : 3}); 
	*/
	var gl = this.magoManager.getGl();
	// create frame buffer object.
	
	if(!this.fbo) // simulation fbo (512 x 512).
	{
		var bufferWidth = this.simulationTextureWidth;
		var bufferHeight = this.simulationTextureHeight;
		var bUseMultiRenderTarget = this.magoManager.postFxShadersManager.bUseMultiRenderTarget;

		this.fbo = new FBO(gl, bufferWidth, bufferHeight, {matchCanvasSize: false, multiRenderTarget : bUseMultiRenderTarget, numColorBuffers : 3}); 
	}

	if(!this.depthFbo) // screen size fbo.
	{
		var magoManager = this.magoManager;
		var sceneState = magoManager.sceneState;
		var bufferWidth = sceneState.drawingBufferWidth[0];
		var bufferHeight = sceneState.drawingBufferHeight[0];
		var bUseMultiRenderTarget = magoManager.postFxShadersManager.bUseMultiRenderTarget;

		this.depthFbo = new FBO(gl, bufferWidth, bufferHeight, {matchCanvasSize: true, multiRenderTarget : bUseMultiRenderTarget, numColorBuffers : 3}); 
	}

	// Water particles.**************************************************************************************************************************************************
	// Create indices for the particles.
	this.numParticles = this.windRes * this.windRes;
	var particleIndices = new Float32Array(this.numParticles);
	for (var i = 0; i < this.numParticles; i++) 
	{ particleIndices[i] = i; }
	this.particleIndexBuffer = FBO.createBuffer(gl, particleIndices);

	this.particlesRenderTexWidth = 2048;
	this.particlesRenderTexHeight = 2048;

	if(!this.windParticlesPosFbo) // simulation fbo (windRes x windRes).
	{
		var bufferWidth = this.windRes;
		var bufferHeight = this.windRes;
		var bUseMultiRenderTarget = this.magoManager.postFxShadersManager.bUseMultiRenderTarget;

		this.windParticlesPosFbo = new FBO(gl, bufferWidth, bufferHeight, {matchCanvasSize: false, multiRenderTarget : bUseMultiRenderTarget, numColorBuffers : 1}); 
	}

	if(!this.windParticlesRenderingFbo) // simulation fbo (windRes x windRes).
	{
		var bufferWidth = this.particlesRenderTexWidth;
		var bufferHeight = this.particlesRenderTexHeight;
		var bUseMultiRenderTarget = this.magoManager.postFxShadersManager.bUseMultiRenderTarget;

		this.windParticlesRenderingFbo = new FBO(gl, bufferWidth, bufferHeight, {matchCanvasSize: false, multiRenderTarget : bUseMultiRenderTarget, numColorBuffers : 3}); 
	}
};

 /**
 * render
 */
WaterManager.prototype.createDefaultShaders = function ()
{
    // the water render shader.
    var magoManager = this.magoManager;
    var gl = magoManager.getGl();

    var use_linearOrLogarithmicDepth = "USE_LINEAR_DEPTH";
	var use_multi_render_target = "NO_USE_MULTI_RENDER_TARGET";
	var glVersion = gl.getParameter(gl.VERSION);
	
	if (!magoManager.isCesiumGlobe())
	{
		var supportEXT = gl.getSupportedExtensions().indexOf("EXT_frag_depth");
		if (supportEXT > -1)
		{
			gl.getExtension("EXT_frag_depth");
		}
		magoManager.EXTENSIONS_init = true;
		use_linearOrLogarithmicDepth = "USE_LOGARITHMIC_DEPTH";

		magoManager.postFxShadersManager.bUseLogarithmicDepth = true;
	}

	magoManager.postFxShadersManager.bUseMultiRenderTarget = false;
	var supportEXT = gl.getSupportedExtensions().indexOf("WEBGL_draw_buffers");
	if (supportEXT > -1)
	{
		var extbuffers = gl.getExtension("WEBGL_draw_buffers");
		magoManager.postFxShadersManager.bUseMultiRenderTarget = true;
		use_multi_render_target = "USE_MULTI_RENDER_TARGET";
	}

	var userAgent = window.navigator.userAgent;
	var isIE = userAgent.indexOf('Trident') > -1;
	if (isIE) 
	{
		use_linearOrLogarithmicDepth = "USE_LINEAR_DEPTH";
		magoManager.postFxShadersManager.bUseLogarithmicDepth = false;	
	}

	// here creates the necessary shaders for waterManager.***
	// 1) waterRender Shader.********************************************************************************************
	var shaderName = "waterRender";
	var vs_source = ShaderSource.waterRenderVS;
	var fs_source = ShaderSource.waterRenderFS;
	fs_source = fs_source.replace(/%USE_LOGARITHMIC_DEPTH%/g, use_linearOrLogarithmicDepth);
	fs_source = fs_source.replace(/%USE_MULTI_RENDER_TARGET%/g, use_multi_render_target);
	var shader = magoManager.postFxShadersManager.createShaderProgram(gl, vs_source, fs_source, shaderName, this.magoManager);
	shader.u_SimRes_loc = gl.getUniformLocation(shader.program, "u_SimRes");
	shader.hightmap_loc = gl.getUniformLocation(shader.program, "waterHeightTex");
	shader.terrainmap_loc = gl.getUniformLocation(shader.program, "terrainmap");
	shader.waterTex_loc = gl.getUniformLocation(shader.program, "waterTex");
	shader.contaminantHeightTex_loc = gl.getUniformLocation(shader.program, "contaminantHeightTex");
	shader.u_heightMap_MinMax_loc = gl.getUniformLocation(shader.program, "u_heightMap_MinMax");
	shader.u_screenSize_loc = gl.getUniformLocation(shader.program, "u_screenSize");
	shader.projectionMatrixInv_loc = gl.getUniformLocation(shader.program, "projectionMatrixInv");//
	shader.uWaterType_loc = gl.getUniformLocation(shader.program, "uWaterType");//
	shader.u_waterMaxHeigh_loc = gl.getUniformLocation(shader.program, "u_waterMaxHeigh");
	shader.u_RenderParticles_loc = gl.getUniformLocation(shader.program, "u_RenderParticles");
	shader.u_contaminantMaxHeigh_loc = gl.getUniformLocation(shader.program, "u_contaminantMaxHeigh");

	magoManager.postFxShadersManager.useProgram(shader);
	//gl.uniform1i(shader.depthTex_loc, 0);
	gl.uniform1i(shader.hightmap_loc, 1); // this is water height tex.
	gl.uniform1i(shader.terrainmap_loc, 2); // this is terrain height tex.
	gl.uniform1i(shader.waterTex_loc, 3); // this is water color tex.
	gl.uniform1i(shader.contaminantHeightTex_loc, 4); // this is contaminant height tex.
	

	// 1) waterRender Shader.********************************************************************************************
	var shaderName = "waterDepthRender";
	var vs_source = ShaderSource.waterDepthRenderVS;
	var fs_source = ShaderSource.waterDepthRenderFS;
	fs_source = fs_source.replace(/%USE_LOGARITHMIC_DEPTH%/g, use_linearOrLogarithmicDepth);
	fs_source = fs_source.replace(/%USE_MULTI_RENDER_TARGET%/g, use_multi_render_target);
	var shader = magoManager.postFxShadersManager.createShaderProgram(gl, vs_source, fs_source, shaderName, this.magoManager);
	shader.u_SimRes_loc = gl.getUniformLocation(shader.program, "u_SimRes");
	shader.hightmap_loc = gl.getUniformLocation(shader.program, "waterHeightTex");
	shader.terrainmap_loc = gl.getUniformLocation(shader.program, "terrainmap");
	shader.contaminantHeightTex_loc = gl.getUniformLocation(shader.program, "contaminantHeightTex");
	shader.u_heightMap_MinMax_loc = gl.getUniformLocation(shader.program, "u_heightMap_MinMax");
	shader.u_waterMaxHeigh_loc = gl.getUniformLocation(shader.program, "u_waterMaxHeigh");
	shader.u_contaminantMaxHeigh_loc = gl.getUniformLocation(shader.program, "u_contaminantMaxHeigh");

	magoManager.postFxShadersManager.useProgram(shader);
	gl.uniform1i(shader.hightmap_loc, 0);
	gl.uniform1i(shader.terrainmap_loc, 1);
	gl.uniform1i(shader.contaminantHeightTex_loc, 2); // this is contaminant height tex.

	// 1.1) terrainRender Shader.********************************************************************************************
	var shaderName = "terrainRender";
	var vs_source = ShaderSource.waterSimTerrainRenderVS;
	var fs_source = ShaderSource.waterSimTerrainRenderFS;
	fs_source = fs_source.replace(/%USE_LOGARITHMIC_DEPTH%/g, use_linearOrLogarithmicDepth);
	fs_source = fs_source.replace(/%USE_MULTI_RENDER_TARGET%/g, use_multi_render_target);
	var shader = magoManager.postFxShadersManager.createShaderProgram(gl, vs_source, fs_source, shaderName, this.magoManager);
	shader.u_SimRes_loc = gl.getUniformLocation(shader.program, "u_SimRes");
	shader.u_screenSize_loc = gl.getUniformLocation(shader.program, "u_screenSize");
	shader.hightmap_loc = gl.getUniformLocation(shader.program, "hightmap");
	shader.terrainmap_loc = gl.getUniformLocation(shader.program, "terrainmap");
	shader.u_heightMap_MinMax_loc = gl.getUniformLocation(shader.program, "u_heightMap_MinMax");
	shader.difusseTex_loc = gl.getUniformLocation(shader.program, "diffuseTex");

	magoManager.postFxShadersManager.useProgram(shader);
	gl.uniform1i(shader.hightmap_loc, 0);
	gl.uniform1i(shader.terrainmap_loc, 1);
	gl.uniform1i(shader.difusseTex_loc, 2);

	// 2) calculate waterHeight by water source and rain.*******************************************************************
	shaderName = "waterCalculateHeight";
	vs_source = ShaderSource.waterQuadVertVS;
	fs_source = ShaderSource.waterCalculateHeightFS;
	fs_source = fs_source.replace(/%USE_LOGARITHMIC_DEPTH%/g, use_linearOrLogarithmicDepth);
	fs_source = fs_source.replace(/%USE_MULTI_RENDER_TARGET%/g, use_multi_render_target);
	shader = magoManager.postFxShadersManager.createShaderProgram(gl, vs_source, fs_source, shaderName, this.magoManager);
	shader.u_existRain_loc = gl.getUniformLocation(shader.program, "u_existRain"); // change this by rainMaxHeight
	shader.u_waterMaxHeigh_loc = gl.getUniformLocation(shader.program, "u_waterMaxHeigh");
	shader.u_contaminantMaxHeigh_loc = gl.getUniformLocation(shader.program, "u_contaminantMaxHeigh");

	shader.waterSourceTex_loc = gl.getUniformLocation(shader.program, "waterSourceTex");
	shader.contaminantSourceTex_loc = gl.getUniformLocation(shader.program, "contaminantSourceTex");
	shader.rainTex_loc = gl.getUniformLocation(shader.program, "rainTex");
	shader.currWaterHeightTex_loc = gl.getUniformLocation(shader.program, "currWaterHeightTex");
	shader.currContaminationHeightTex_loc = gl.getUniformLocation(shader.program, "currContaminationHeightTex");
	magoManager.postFxShadersManager.useProgram(shader);
	gl.uniform1i(shader.waterSourceTex_loc, 0);
	gl.uniform1i(shader.rainTex_loc, 1);
	gl.uniform1i(shader.currWaterHeightTex_loc, 2);
	gl.uniform1i(shader.contaminantSourceTex_loc, 3);
	gl.uniform1i(shader.currContaminationHeightTex_loc, 4);

	// 3) calculateFlux Shader.*********************************************************************************************
	shaderName = "waterCalculateFlux";
	vs_source = ShaderSource.waterQuadVertVS;
	fs_source = ShaderSource.waterCalculateFluxFS;
	fs_source = fs_source.replace(/%USE_LOGARITHMIC_DEPTH%/g, use_linearOrLogarithmicDepth);
	fs_source = fs_source.replace(/%USE_MULTI_RENDER_TARGET%/g, use_multi_render_target);
	shader = magoManager.postFxShadersManager.createShaderProgram(gl, vs_source, fs_source, shaderName, this.magoManager);
	shader.u_SimRes_loc = gl.getUniformLocation(shader.program, "u_SimRes");
	shader.u_PipeLen_loc = gl.getUniformLocation(shader.program, "u_PipeLen");
	shader.u_timestep_loc = gl.getUniformLocation(shader.program, "u_timestep");
	shader.u_PipeArea_loc = gl.getUniformLocation(shader.program, "u_PipeArea");
	shader.u_heightMap_MinMax_loc = gl.getUniformLocation(shader.program, "u_heightMap_MinMax");
	shader.u_waterMaxHeigh_loc = gl.getUniformLocation(shader.program, "u_waterMaxHeigh");
	shader.u_waterMaxFlux_loc = gl.getUniformLocation(shader.program, "u_waterMaxFlux");
	shader.u_tileSize_loc = gl.getUniformLocation(shader.program, "u_tileSize");

	shader.u_simulationTextureSize_loc = gl.getUniformLocation(shader.program, "u_simulationTextureSize");
	shader.u_terrainTextureSize_loc = gl.getUniformLocation(shader.program, "u_terrainTextureSize");
	shader.u_contaminantMaxHeigh_loc = gl.getUniformLocation(shader.program, "u_contaminantMaxHeigh");

	shader.waterHeightTex_loc = gl.getUniformLocation(shader.program, "waterHeightTex");
	shader.terrainHeightTex_loc = gl.getUniformLocation(shader.program, "terrainHeightTex");
	shader.currWaterFluxTex_HIGH_loc = gl.getUniformLocation(shader.program, "currWaterFluxTex_HIGH");
	shader.currWaterFluxTex_LOW_loc = gl.getUniformLocation(shader.program, "currWaterFluxTex_LOW");
	shader.contaminantHeightTex_loc = gl.getUniformLocation(shader.program, "contaminantHeightTex");
	magoManager.postFxShadersManager.useProgram(shader);
	gl.uniform1i(shader.waterHeightTex_loc, 0);
	gl.uniform1i(shader.terrainHeightTex_loc, 1);
	gl.uniform1i(shader.currWaterFluxTex_HIGH_loc, 2);
	gl.uniform1i(shader.currWaterFluxTex_LOW_loc, 3);
	gl.uniform1i(shader.contaminantHeightTex_loc, 4);
	

	// 4) calculateVelocity Shader.*********************************************************************************************
	shaderName = "waterCalculateVelocity";
	vs_source = ShaderSource.waterQuadVertVS;
	fs_source = ShaderSource.waterCalculateVelocityFS;
	fs_source = fs_source.replace(/%USE_LOGARITHMIC_DEPTH%/g, use_linearOrLogarithmicDepth);
	fs_source = fs_source.replace(/%USE_MULTI_RENDER_TARGET%/g, use_multi_render_target);
	shader = magoManager.postFxShadersManager.createShaderProgram(gl, vs_source, fs_source, shaderName, this.magoManager);
	shader.u_SimRes_loc = gl.getUniformLocation(shader.program, "u_SimRes");
	shader.u_PipeLen_loc = gl.getUniformLocation(shader.program, "u_PipeLen");
	shader.u_timestep_loc = gl.getUniformLocation(shader.program, "u_timestep");
	shader.u_PipeArea_loc = gl.getUniformLocation(shader.program, "u_PipeArea");
	shader.u_heightMap_MinMax_loc = gl.getUniformLocation(shader.program, "u_heightMap_MinMax");
	shader.u_waterMaxHeigh_loc = gl.getUniformLocation(shader.program, "u_waterMaxHeigh");
	shader.u_waterMaxFlux_loc = gl.getUniformLocation(shader.program, "u_waterMaxFlux");
	shader.u_tileSize_loc = gl.getUniformLocation(shader.program, "u_tileSize");
	shader.u_waterMaxVelocity_loc = gl.getUniformLocation(shader.program, "u_waterMaxVelocity");

	shader.u_simulationTextureSize_loc = gl.getUniformLocation(shader.program, "u_simulationTextureSize");
	shader.u_terrainTextureSize_loc = gl.getUniformLocation(shader.program, "u_terrainTextureSize");
	shader.u_contaminantMaxHeigh_loc = gl.getUniformLocation(shader.program, "u_contaminantMaxHeigh");

	shader.waterHeightTex_loc = gl.getUniformLocation(shader.program, "waterHeightTex");
	shader.terrainHeightTex_loc = gl.getUniformLocation(shader.program, "terrainHeightTex");
	shader.currWaterFluxTex_loc = gl.getUniformLocation(shader.program, "currWaterFluxTex");
	shader.currWaterFluxTex_HIGH_loc = gl.getUniformLocation(shader.program, "currWaterFluxTex_HIGH");
	shader.currWaterFluxTex_LOW_loc = gl.getUniformLocation(shader.program, "currWaterFluxTex_LOW");
	shader.contaminantHeightTex_loc = gl.getUniformLocation(shader.program, "contaminantHeightTex");
	magoManager.postFxShadersManager.useProgram(shader);
	gl.uniform1i(shader.waterHeightTex_loc, 0);
	gl.uniform1i(shader.terrainHeightTex_loc, 1);
	gl.uniform1i(shader.currWaterFluxTex_HIGH_loc, 2);
	gl.uniform1i(shader.currWaterFluxTex_LOW_loc, 3);
	gl.uniform1i(shader.contaminantHeightTex_loc, 4);

	// 4.1) Calculate sediment shader.******************************************************************************************
	shaderName = "waterCalculateSediment";
	vs_source = ShaderSource.waterQuadVertVS;
	fs_source = ShaderSource.waterCalculateSedimentFS;
	fs_source = fs_source.replace(/%USE_LOGARITHMIC_DEPTH%/g, use_linearOrLogarithmicDepth);
	fs_source = fs_source.replace(/%USE_MULTI_RENDER_TARGET%/g, use_multi_render_target);
	shader = magoManager.postFxShadersManager.createShaderProgram(gl, vs_source, fs_source, shaderName, this.magoManager);

	shader.waterHeightTex_loc = gl.getUniformLocation(shader.program, "waterHeightTex");
	shader.terrainHeightTex_loc = gl.getUniformLocation(shader.program, "terrainHeightTex");
	shader.currWaterFluxTex_loc = gl.getUniformLocation(shader.program, "currWaterFluxTex");
	magoManager.postFxShadersManager.useProgram(shader);
	gl.uniform1i(shader.waterHeightTex_loc, 0);
	gl.uniform1i(shader.terrainHeightTex_loc, 1);
	gl.uniform1i(shader.currWaterFluxTex_loc, 2);

	// 4.1) Calculate contaminant shader.******************************************************************************************
	shaderName = "waterCalculateContamination";
	vs_source = ShaderSource.waterQuadVertVS;
	fs_source = ShaderSource.waterCalculateContaminationFS;
	fs_source = fs_source.replace(/%USE_LOGARITHMIC_DEPTH%/g, use_linearOrLogarithmicDepth);
	fs_source = fs_source.replace(/%USE_MULTI_RENDER_TARGET%/g, use_multi_render_target);
	shader = magoManager.postFxShadersManager.createShaderProgram(gl, vs_source, fs_source, shaderName, this.magoManager);
	shader.u_heightMap_MinMax_loc = gl.getUniformLocation(shader.program, "u_heightMap_MinMax");
	shader.u_waterMaxHeigh_loc = gl.getUniformLocation(shader.program, "u_waterMaxHeigh");
	shader.u_waterMaxFlux_loc = gl.getUniformLocation(shader.program, "u_waterMaxFlux");
	shader.u_tileSize_loc = gl.getUniformLocation(shader.program, "u_tileSize");
	shader.u_waterMaxVelocity_loc = gl.getUniformLocation(shader.program, "u_waterMaxVelocity");
	shader.u_contaminantMaxHeigh_loc = gl.getUniformLocation(shader.program, "u_contaminantMaxHeigh");

	shader.waterHeightTex_loc = gl.getUniformLocation(shader.program, "waterHeightTex");
	shader.terrainHeightTex_loc = gl.getUniformLocation(shader.program, "terrainHeightTex");
	shader.currWaterFluxTex_loc = gl.getUniformLocation(shader.program, "currWaterFluxTex");
	magoManager.postFxShadersManager.useProgram(shader);
	gl.uniform1i(shader.waterHeightTex_loc, 0);
	gl.uniform1i(shader.terrainHeightTex_loc, 1);
	gl.uniform1i(shader.currWaterFluxTex_loc, 2);

	// 5) calculateVelocity Shader.*********************************************************************************************
	shaderName = "waterOrthogonalDepthRender";
	vs_source = ShaderSource.WaterOrthogonalDepthShaderVS;
	fs_source = ShaderSource.WaterOrthogonalDepthShaderFS;
	fs_source = fs_source.replace(/%USE_LOGARITHMIC_DEPTH%/g, use_linearOrLogarithmicDepth);
	fs_source = fs_source.replace(/%USE_MULTI_RENDER_TARGET%/g, use_multi_render_target);
	shader = magoManager.postFxShadersManager.createShaderProgram(gl, vs_source, fs_source, shaderName, this.magoManager);
	shader.u_modelViewProjectionMatrix_loc = gl.getUniformLocation(shader.program, "modelViewProjectionMatrix");
	shader.u_screenSize_loc = gl.getUniformLocation(shader.program, "u_screenSize");
	shader.currDEMTex_loc = gl.getUniformLocation(shader.program, "currDEMTex");
	magoManager.postFxShadersManager.useProgram(shader);
	gl.uniform1i(shader.currDEMTex_loc, 0);

	// 6) simple texture copy Shader.*********************************************************************************************
	shaderName = "waterCopyTexture";
	vs_source = ShaderSource.waterQuadVertVS;
	fs_source = ShaderSource.waterCopyFS;
	fs_source = fs_source.replace(/%USE_LOGARITHMIC_DEPTH%/g, use_linearOrLogarithmicDepth);
	fs_source = fs_source.replace(/%USE_MULTI_RENDER_TARGET%/g, use_multi_render_target);
	shader = magoManager.postFxShadersManager.createShaderProgram(gl, vs_source, fs_source, shaderName, this.magoManager);
	shader.texToCopy_loc = gl.getUniformLocation(shader.program, "texToCopy");
	shader.u_textureFlipYAxis_loc = gl.getUniformLocation(shader.program, "u_textureFlipYAxis");
	magoManager.postFxShadersManager.useProgram(shader);
	gl.uniform1i(shader.texToCopy_loc, 0);

	// 7) water particles update shader.*********************************************************************************************
	shaderName = "waterParticlesUpdate";
	vs_source = ShaderSource.waterQuadVertVS;
	fs_source = ShaderSource.waterUpdateParticlesFS;
	fs_source = fs_source.replace(/%USE_LOGARITHMIC_DEPTH%/g, use_linearOrLogarithmicDepth);
	fs_source = fs_source.replace(/%USE_MULTI_RENDER_TARGET%/g, use_multi_render_target);
	shader = magoManager.postFxShadersManager.createShaderProgram(gl, vs_source, fs_source, shaderName, this.magoManager);
	shader.u_particles_loc = gl.getUniformLocation(shader.program, "u_particles"); // smple2d.
	shader.u_wind_loc = gl.getUniformLocation(shader.program, "u_wind"); // smple2d.

	shader.u_flipTexCoordY_windMap_loc = gl.getUniformLocation(shader.program, "u_flipTexCoordY_windMap");
	shader.u_wind_res_loc = gl.getUniformLocation(shader.program, "u_wind_res");
	shader.u_wind_min_loc = gl.getUniformLocation(shader.program, "u_wind_min");
	shader.u_wind_max_loc = gl.getUniformLocation(shader.program, "u_wind_max");
	shader.u_geoCoordRadiansMax_loc = gl.getUniformLocation(shader.program, "u_geoCoordRadiansMax");
	shader.u_geoCoordRadiansMin_loc = gl.getUniformLocation(shader.program, "u_geoCoordRadiansMin");
	shader.u_speed_factor_loc = gl.getUniformLocation(shader.program, "u_speed_factor");
	shader.u_drop_rate_loc = gl.getUniformLocation(shader.program, "u_drop_rate");
	shader.u_drop_rate_bump_loc = gl.getUniformLocation(shader.program, "u_drop_rate_bump");
	shader.u_rand_seed_loc = gl.getUniformLocation(shader.program, "u_rand_seed");
	magoManager.postFxShadersManager.useProgram(shader);
	gl.uniform1i(shader.u_particles_loc, 0);
	gl.uniform1i(shader.u_wind_loc, 1);

	// 7) water particles render shader.*********************************************************************************************
	shaderName = "waterParticlesRender";
	vs_source = ShaderSource.waterParticlesRenderVS;
	fs_source = ShaderSource.waterParticlesRenderFS;
	fs_source = fs_source.replace(/%USE_LOGARITHMIC_DEPTH%/g, use_linearOrLogarithmicDepth);
	fs_source = fs_source.replace(/%USE_MULTI_RENDER_TARGET%/g, use_multi_render_target);
	shader = magoManager.postFxShadersManager.createShaderProgram(gl, vs_source, fs_source, shaderName, this.magoManager);
	shader.u_particles_loc = gl.getUniformLocation(shader.program, "u_particles"); // smple2d.
	shader.u_wind_loc = gl.getUniformLocation(shader.program, "u_wind"); // smple2d.

	shader.u_particles_res_loc = gl.getUniformLocation(shader.program, "u_particles_res");
	shader.u_flipTexCoordY_windMap_loc = gl.getUniformLocation(shader.program, "u_flipTexCoordY_windMap");
	shader.u_wind_min_loc = gl.getUniformLocation(shader.program, "u_wind_min");
	shader.u_wind_max_loc = gl.getUniformLocation(shader.program, "u_wind_max");
	shader.u_colorScale_loc = gl.getUniformLocation(shader.program, "u_colorScale");

	magoManager.postFxShadersManager.useProgram(shader);
	gl.uniform1i(shader.u_particles_loc, 0);
	gl.uniform1i(shader.u_wind_loc, 1);

	// 7) water particles render shader.*********************************************************************************************
	shaderName = "waterParticlesRenderFade";
	vs_source = ShaderSource.waterQuadVertVS;
	fs_source = ShaderSource.waterParticlesRenderingFadeFS;
	//fs_source = fs_source.replace(/%USE_LOGARITHMIC_DEPTH%/g, use_linearOrLogarithmicDepth);
	//fs_source = fs_source.replace(/%USE_MULTI_RENDER_TARGET%/g, use_multi_render_target);
	shader = magoManager.postFxShadersManager.createShaderProgram(gl, vs_source, fs_source, shaderName, this.magoManager);
	shader.u_screen_loc = gl.getUniformLocation(shader.program, "u_screen"); // smple2d.
	shader.u_opacity_loc = gl.getUniformLocation(shader.program, "u_opacity");
	magoManager.postFxShadersManager.useProgram(shader);
	gl.uniform1i(shader.u_screen_loc, 0);
	
	
};

WaterManager.prototype.getQuadBuffer = function ()
{
	if(!this.screenQuad)
	{
		var gl = this.magoManager.getGl();
		var posData = new Float32Array([0, 0,   1, 0,   0, 1,   0, 1,   1, 0,   1, 1]); // total screen.
		var webglposBuffer = FBO.createBuffer(gl, posData);

		this.screenQuad = {
			posBuffer : webglposBuffer
		};
	}

	return this.screenQuad;
};

WaterManager.prototype._newTexture = function (gl, texWidth, texHeight)
{
	var imageData = new Uint8Array(texWidth * texHeight * 4);
	var tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);  // depthTex.
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); //LINEAR_MIPMAP_LINEAR
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texWidth, texHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

	gl.bindTexture(gl.TEXTURE_2D, null);

	var magoTexture = new Texture();
	magoTexture.texId = tex;
	magoTexture.fileLoadState = CODE.fileLoadState.BINDING_FINISHED;

	return magoTexture;
};

WaterManager.prototype.doIntersectedObjectsCulling = function (visiblesArray, nativeVisiblesArray)
{
	var isFarestFrustum = this.magoManager.isFarestFrustum();
	//if(!this.bObjectsCulling)
	//{
		var waterLayersCount = this.waterLayersArray.length;
		var waterLayer;

		if(isFarestFrustum)
		{
			for(var i=0; i<waterLayersCount; i++)
			{
				waterLayer = this.waterLayersArray[i];
				if(waterLayer.visibleObjectsControler)
				{ waterLayer.visibleObjectsControler.clear(); }
			}
		}

		for(var i=0; i<waterLayersCount; i++)
		{
			waterLayer = this.waterLayersArray[i];
			waterLayer.doIntersectedObjectsCulling(visiblesArray, nativeVisiblesArray);
		}

		this.bObjectsCulling = true;
	//}
};

WaterManager.prototype.overWriteDEMWithObjects = function ()
{
	var waterLayersCount = this.waterLayersArray.length;
	var waterLayer;
	var shader;
	var magoManager = this.magoManager;

	for(var i=0; i<waterLayersCount; i++)
	{
		waterLayer = this.waterLayersArray[i];
		waterLayer.overWriteDEMWithObjects(shader, magoManager);
	}
};

WaterManager.prototype.render = function ()
{
	var magoManager = this.magoManager;
	var sceneState = magoManager.sceneState;
	var gl = magoManager.getGl();

	this.overWriteDEMWithObjects();

	if(this.magoManager.isFarestFrustum())
	{ 
		this.doSimulation(); 
	}

	var waterLayersCount = this.waterLayersArray.length;
	var waterLayer;

	// Now, render the water depth.************************************************************************
	// Note: the water depth must be rendered in the depth framebuffer:
	if(!this.depthTex || !this.depthTex.texId)
	{
		var texWidth = sceneState.drawingBufferWidth[0];
		var texHeight = sceneState.drawingBufferHeight[0];
		this.depthTex = this._newTexture(gl, texWidth, texHeight);
	}
	
	var fbo = this.depthFbo;
	var extbuffers = fbo.extbuffers;
	fbo.bind();
	gl.viewport(0, 0, fbo.width[0], fbo.height[0]);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.depthTex.texId, 0); // depthTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, null, 0); // normalTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT2_WEBGL, gl.TEXTURE_2D, null, 0); // albedoTex.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extbuffers.COLOR_ATTACHMENT3_WEBGL, gl.TEXTURE_2D, null, 0); // .
	extbuffers.drawBuffersWEBGL([
		extbuffers.COLOR_ATTACHMENT0_WEBGL, // gl_FragData[0]
		extbuffers.NONE, // gl_FragData[1]
		extbuffers.NONE, // gl_FragData[2]
		extbuffers.NONE, // gl_FragData[3]
		]);

	var shader = magoManager.postFxShadersManager.getShader("waterDepthRender");
	magoManager.postFxShadersManager.useProgram(shader);
	shader.bindUniformGenerals();

	gl.disable(gl.BLEND);
	gl.clearColor(0.0, 0.0, 0.0, 0.0);
	gl.clearDepth(1.0);
	if(this.magoManager.isFarestFrustum())
	{ gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); }

	
	for(var i=0; i<waterLayersCount; i++)
	{
		waterLayer = this.waterLayersArray[i];
		waterLayer.renderWaterDepth(shader, magoManager);
	}
	
	// Once finished simulation, bind the current framebuffer.
	magoManager.bindMainFramebuffer();
	gl.viewport(0, 0, sceneState.drawingBufferWidth[0], sceneState.drawingBufferHeight[0]);

	// 1rst render terrain.********************************************************************************
	var shader = magoManager.postFxShadersManager.getShader("terrainRender");
	magoManager.postFxShadersManager.useProgram(shader);
	shader.bindUniformGenerals();
	for(var i=0; i<waterLayersCount; i++)
	{
		waterLayer = this.waterLayersArray[i];
		waterLayer.renderTerrain(shader, magoManager);
	}

	// 2nd, render water.**********************************************************************************
	shader = magoManager.postFxShadersManager.getShader("waterRender");
	magoManager.postFxShadersManager.useProgram(shader);
	shader.bindUniformGenerals();

	// Bind the textures:
	var flipYTexCoord = false;
	gl.uniform1i(shader.textureFlipYAxis_loc, flipYTexCoord);
	shader.enableVertexAttribArray(shader.position3_loc);
	shader.enableVertexAttribArray(shader.texCoord2_loc);
	gl.uniform1i(shader.colorType_loc, 2); // 0= oneColor, 1= attribColor, 2= texture.
	gl.uniform1i(shader.u_RenderParticles_loc, 1); // render particles.

	gl.enable(gl.DEPTH_TEST);

	for(var i=0; i<waterLayersCount; i++)
	{
		waterLayer = this.waterLayersArray[i];
		waterLayer.renderWater(shader, magoManager);
	}
};

/**
 * render
 */
WaterManager.prototype.doSimulation = function ()
{
	// bind frameBuffer.
	var waterLayersCount = this.waterLayersArray.length;
	var waterLayer;
	for(var i=0; i<waterLayersCount; i++)
	{
		waterLayer = this.waterLayersArray[i];
		waterLayer.doSimulationSteps(this.magoManager);
	}
};

 /**
 */
WaterManager.prototype._test_water = function()
{
    // 127.1966787369999992,35.5972825200000003 : 127.2283140579999952,35.6277023940000035 // original from BBC.
	var increLon = 5.0;
	var increLat = 25.0;

	increLon = 0.0;
	increLat = 0.0;

    var minLon = 127.1966787369999992 + increLon;
    var minLat = 35.5972825200000003 + increLat;
    var minAlt = 0;
    var maxLon = 127.2283140579999952 + increLon;
    var maxLat = 35.6277023940000035 + increLat;
    var maxAlt = 0;
    var geographicExtent = new GeographicExtent(minLon, minLat, minAlt, maxLon, maxLat, maxAlt);
    var options = {
        geographicExtent : geographicExtent
    };
    var water = this.newWater(options);

	//----------------------------------------------
    this.testStarted = true;
};
