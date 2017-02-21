'use strict';

/**
 * 어떤 일을 하고 있습니까?
 * @class Octree
 * @param octreeOwner 변수
 */
var Octree = function(octreeOwner) {
	if(!(this instanceof Octree)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}
	
	// Note: an octree is a cube, not a box.***
	this.centerPos = new Point3D();
	this.half_dx = 0.0; // half width.***
	this.half_dy = 0.0; // half length.***
	this.half_dz = 0.0; // half height.***
	
	this.octree_owner;
	this.octree_level = 0;
	this.octree_number_name = 0;
	this.squareDistToEye = 10000.0;
	  
	if(octreeOwner)
	{
		this.octree_owner = octreeOwner;
		this.octree_level = octreeOwner.octree_level + 1;
	}

    this.subOctrees_array = [];
    this._compRefsList_Array = []; // empty if this is not smallest octreeBox. NO USED. Delete this.***
	this.neoRefsList_Array = []; // empty if this is not smallest octreeBox.***
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof Octree
 * @returns subOctree 변수
 */
Octree.prototype.newSubOctree = function() {
	var subOctree = new Octree(this);
	this.subOctrees_array.push(subOctree);
	return subOctree;
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof Octree
 * @param treeDepth 변수
 */
Octree.prototype.makeTree = function(treeDepth) {
	if(this.octree_level < treeDepth) {
		for(var i=0; i<8; i++) {
			var subOctree = this.newSubOctree();
			subOctree.octree_number_name = this.octree_number_name * 10 + (i+1);
		}
		  
		this.setSizesSubBoxes();
		  
		for(var i=0; i<8; i++) {
			this.subOctrees_array[i].makeTree(treeDepth);
		}
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof Octree
 * @param intNumber 변수
 * @returns numDigits
 */
Octree.prototype.getNumberOfDigits = function(intNumber) {
	if(intNumber > 0) {
		var numDigits = Math.floor(Math.log10(intNumber)+1);
		return numDigits;
	} else {
		return 1;
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof Octree
 */
Octree.prototype.getMotherOctree = function() {
	if(this.octree_owner == undefined) {
		return this;
	} else {
		return this.octree_owner.getMotherOctree();
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof Octree
 * @param octreeNumberName 변수
 * @param numDigits 변수
 * @returns subOctrees_array[idx-1].getOctree(rest_octreeNumberName, numDigits-1)
 */
Octree.prototype.getOctree = function(octreeNumberName, numDigits) {
	if(numDigits == 1) {
		if(octreeNumberName == 0)
			return this.getMotherOctree();
		else {
			return this.subOctrees_array[octreeNumberName-1];
		}
	}
	  
	// determine the next level octree.***
	var exp = numDigits-1;
	var denominator = Math.pow(10, exp);
	var idx = Math.floor(octreeNumberName /denominator) % 10;
	var rest_octreeNumberName = octreeNumberName - idx * denominator;
	return this.subOctrees_array[idx-1].getOctree(rest_octreeNumberName, numDigits-1);
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof Octree
 * @param octreeNumberName 변수
 * @returns motherOctree.subOctrees_array[idx-1].getOctree(rest_octreeNumberName, numDigits-1)
 */
Octree.prototype.getOctreeByNumberName = function(octreeNumberName) {
	var motherOctree = this.getMotherOctree();
	  
	var numDigits = this.getNumberOfDigits(octreeNumberName);
	  
	if(numDigits == 1) {
		if(octreeNumberName == 0)
			return motherOctree;
		else{
			return motherOctree.subOctrees_array[octreeNumberName-1];
		}
	}
	  
	if(motherOctree.subOctrees_array.length == 0)
		return undefined;
	  
	// determine the next level octree.***
	var exp = numDigits-1;
	var denominator = Math.pow(10, exp);
	var idx = Math.floor(octreeNumberName /denominator) % 10;
	var rest_octreeNumberName = octreeNumberName - idx * denominator;
	return motherOctree.subOctrees_array[idx-1].getOctree(rest_octreeNumberName, numDigits-1);
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof Octree
 */
Octree.prototype.setSizesSubBoxes = function() {
	// Octree number name.********************************
	// Bottom                      Top
	// |---------|---------|     |---------|---------|
	// |         |         |     |         |         |       Y
	// |    3    |    2    |     |    7    |    6    |       ^
	// |         |         |     |         |         |       |
	// |---------+---------|     |---------+---------|       |
	// |         |         |     |         |         |       |
	// |    0    |    1    |     |    4    |    5    |       |
	// |         |         |     |         |         |       |-----------> X
	// |---------|---------|     |---------|---------|      
	
	var half_x = this.centerPos.x;
	var half_y = this.centerPos.y;
	var half_z = this.centerPos.z;
	
	var min_x = this.centerPos.x - this.half_dx;
	var min_y = this.centerPos.y - this.half_dy;
	var min_z = this.centerPos.z - this.half_dz;
	
	var max_x = this.centerPos.x + this.half_dx;
	var max_y = this.centerPos.y + this.half_dy;
	var max_z = this.centerPos.z + this.half_dz;
	
	if(this.subOctrees_array.length > 0)
	{
		this.subOctrees_array[0].setBoxSize(min_x, half_x, min_y, half_y, min_z, half_z);
		this.subOctrees_array[1].setBoxSize(half_x, max_x, min_y, half_y, min_z, half_z);
		this.subOctrees_array[2].setBoxSize(half_x, max_x, half_y, max_y, min_z, half_z);
		this.subOctrees_array[3].setBoxSize(min_x, half_x, half_y, max_y, min_z, half_z);
		
		this.subOctrees_array[4].setBoxSize(min_x, half_x, min_y, half_y, half_z, max_z);
		this.subOctrees_array[5].setBoxSize(half_x, max_x, min_y, half_y, half_z, max_z);
		this.subOctrees_array[6].setBoxSize(half_x, max_x, half_y, max_y, half_z, max_z);
		this.subOctrees_array[7].setBoxSize(min_x, half_x, half_y, max_y, half_z, max_z);
		
		for(var i=0; i<8; i++)
		{
			this.subOctrees_array[i].setSizesSubBoxes();
		}
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof Octree
 * @param Min_x 변수
 * @param Max_x 변수
 * @param Min_y 변수
 * @param Max_y 변수
 * @param Min_z 변수
 * @param Max_z 변수
 */
Octree.prototype.setBoxSize = function(Min_X, Max_X, Min_Y, Max_Y, Min_Z, Max_Z) { 
	this.centerPos.x = (Max_X + Min_X)/2.0;
	this.centerPos.y = (Max_Y + Min_Y)/2.0;
	this.centerPos.z = (Max_Z + Min_Z)/2.0;
	
	this.half_dx = (Max_X - Min_X)/2.0; // half width.***
	this.half_dy = (Max_Y - Min_Y)/2.0; // half length.***
	this.half_dz = (Max_Z - Min_Z)/2.0; // half height.***
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof Octree
 * @returns centerPos
 */
Octree.prototype.getCenterPos = function() {
	return this.centerPos;
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof Octree
 * @returns Math.abs(this.half_dx*1.2);
 */
Octree.prototype.getRadiusAprox = function() {
	return Math.abs(this.half_dx*1.2);
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof Octree
 * @param result_CRefListsArray 변수
 */  
Octree.prototype.getCRefListArray = function(result_CRefListsArray) {
	if(result_CRefListsArray == undefined)
		result_CRefListsArray = [];
  
	if(this.subOctrees_array.length > 0)
	{
		for(var i=0; i<this.subOctrees_array.length; i++)
		{
			this.subOctrees_array[i].getCRefListArray(result_CRefListsArray);
		}
	}
	else
	{
		if(this._compRefsList_Array.length>0)
		{
			result_CRefListsArray.push(this._compRefsList_Array[0]); // there are only 1.***
		}
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof Octree
 * @param result_NeoRefListsArray 변수
 */
Octree.prototype.getNeoRefListArray = function(result_NeoRefListsArray) {
	if(result_NeoRefListsArray == undefined)
		result_NeoRefListsArray = [];
  
	if(this.subOctrees_array.length > 0)
	{
		for(var i=0; i<this.subOctrees_array.length; i++)
		{
			this.subOctrees_array[i].getCRefListArray(result_NeoRefListsArray);
		}
	}
	else
	{
		if(this.neoRefsList_Array.length>0)
		{
			result_NeoRefListsArray.push(this.neoRefsList_Array[0]); // there are only 1.***
		}
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof Octree
 * @param cesium_cullingVolume 변수
 * @param result_CRefListsArray 변수
 * @param cesium_boundingSphere_scratch 변수
 * @param eye_x 변수
 * @param eye_y 변수
 * @param eye_z 변수
 */
Octree.prototype.getFrustumVisibleCRefListArray = function(cesium_cullingVolume, result_CRefListsArray, cesium_boundingSphere_scratch, eye_x, eye_y, eye_z) {
	var visibleOctreesArray = [];
	var excludedOctArray = [];
	var sortedOctreesArray = [];
	  
	//this.getAllSubOctrees(visibleOctreesArray); // Test.***
	this.getFrustumVisibleOctrees(cesium_cullingVolume, visibleOctreesArray, cesium_boundingSphere_scratch);
	/*
	// Test. Exclude octrees with little frustum intersection.************************************************
	// Test: exclude octrees that the center is rear of the near_plane of culling volume.***
	var octrees_count = visibleOctreesArray.length;
	for(var i=0; i<octrees_count; i++)
	{
		  distAux = Cesium.Plane.getPointDistance(cesium_cullingVolume.planes[5], new Cesium.Cartesian3(visibleOctreesArray[i].centerPos.x, visibleOctreesArray[i].centerPos.y, visibleOctreesArray[i].centerPos.z));
		  cesium_boundingSphere_scratch.center.x = visibleOctreesArray[i].centerPos.x;
		  cesium_boundingSphere_scratch.center.y = visibleOctreesArray[i].centerPos.y;
		  cesium_boundingSphere_scratch.center.z = visibleOctreesArray[i].centerPos.z;
		  cesium_boundingSphere_scratch.radius = visibleOctreesArray[i].getRadiusAprox()*0.7;
		  
		  frustumCull = cesium_cullingVolume.computeVisibility(cesium_boundingSphere_scratch);
		  if(frustumCull == Cesium.Intersect.INSIDE || frustumCull == Cesium.Intersect.INTERSECTING) 
		  {
			  excludedOctArray.push(visibleOctreesArray[i]);
		  }
	  }
	  // End test.---------------------------------------------------------------------------------------------
	  */
	  // Now, we must sort the subOctrees near->far from eye.***
	var visibleOctrees_count = visibleOctreesArray.length;
	  
	for(var i=0; i<visibleOctrees_count; i++)
	{
		visibleOctreesArray[i].setSquareDistToEye(eye_x, eye_y, eye_z);	
		this.putOctreeInEyeDistanceSortedArray(sortedOctreesArray, visibleOctreesArray[i], eye_x, eye_y, eye_z);
	}
	
	for(var i=0; i<visibleOctrees_count; i++)
	{
		sortedOctreesArray[i].getCRefListArray(result_CRefListsArray);
		//visibleOctreesArray[i].getCRefListArray(result_CRefListsArray);
	}
	  
	visibleOctreesArray.length = 0;
	sortedOctreesArray.length = 0;
	excludedOctArray.length = 0;
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof Octree
 * @param cesium_cullingVolume 변수
 * @param result_NeoRefListsArray 변수
 * @param cesium_boundingSphere_scratch 변수
 * @param eye_x 변수
 * @param eye_y 변수
 * @param eye_z 변수
 */
Octree.prototype.getFrustumVisibleNeoRefListArray = function(cesium_cullingVolume, result_NeoRefListsArray, cesium_boundingSphere_scratch, eye_x, eye_y, eye_z) {
	var visibleOctreesArray = [];
	var excludedOctArray = [];
	var sortedOctreesArray = [];
	var distAux = 0.0;
	  
	//this.getAllSubOctrees(visibleOctreesArray); // Test.***
	this.getFrustumVisibleOctreesNeoBuilding(cesium_cullingVolume, visibleOctreesArray, cesium_boundingSphere_scratch); // Original.***
	
	// Now, we must sort the subOctrees near->far from eye.***
	var visibleOctrees_count = visibleOctreesArray.length;
	  
	for(var i=0; i<visibleOctrees_count; i++) {
		visibleOctreesArray[i].setSquareDistToEye(eye_x, eye_y, eye_z);	
		this.putOctreeInEyeDistanceSortedArray(sortedOctreesArray, visibleOctreesArray[i], eye_x, eye_y, eye_z);
	}
	  
	for(var i=0; i<visibleOctrees_count; i++) {
		sortedOctreesArray[i].getNeoRefListArray(result_NeoRefListsArray);
	}
	  
	visibleOctreesArray.length = 0;
	sortedOctreesArray.length = 0;
	excludedOctArray.length = 0;
};

/**
 * 어떤 일을 하고 있습니까?	
 * @memberof Octree
 * @param cesium_cullingVolume 변수
 * @param result_octreesArray 변수
 * @param cesium_boundingSphere_scratch 변수
 */
Octree.prototype.getFrustumVisibleOctreesNeoBuilding = function(cesium_cullingVolume, result_octreesArray, cesium_boundingSphere_scratch) {
	if(this.subOctrees_array.length == 0 && this.neoRefsList_Array.length == 0)
	//if(this.subOctrees_array.length == 0 && this._compRefsList_Array.length == 0) // For use with ifc buildings.***
		return;
	
    // this function has Cesium dependence.***
    if(result_octreesArray == undefined)
	    result_octreesArray = [];
  
    if(cesium_boundingSphere_scratch == undefined)
	    cesium_boundingSphere_scratch = new Cesium.BoundingSphere(); // Cesium dependency.***
  
    cesium_boundingSphere_scratch.center.x = this.centerPos.x;
    cesium_boundingSphere_scratch.center.y = this.centerPos.y;
    cesium_boundingSphere_scratch.center.z = this.centerPos.z;
  
    if(this.subOctrees_array.length == 0)
    {
	    //cesium_boundingSphere_scratch.radius = this.getRadiusAprox()*0.7;
		cesium_boundingSphere_scratch.radius = this.getRadiusAprox();
    }
    else{
	    cesium_boundingSphere_scratch.radius = this.getRadiusAprox();
    }
  
    var frustumCull = cesium_cullingVolume.computeVisibility(cesium_boundingSphere_scratch);
	if(frustumCull == Cesium.Intersect.INSIDE ) 
	{
		//result_octreesArray.push(this);
		this.getAllSubOctrees(result_octreesArray);
	}
	else if(frustumCull == Cesium.Intersect.INTERSECTING  ) 
	{
		if(this.subOctrees_array.length == 0 && this.neoRefsList_Array.length > 0) // original, good.***
		{
			result_octreesArray.push(this);
		}
		else
		{
			for(var i=0; i<this.subOctrees_array.length; i++ )
			{
				this.subOctrees_array[i].getFrustumVisibleOctreesNeoBuilding(cesium_cullingVolume, result_octreesArray, cesium_boundingSphere_scratch);
			}
		}
	}
  // else if(frustumCull == Cesium.Intersect.OUTSIDE) => do nothing.***
};

/**
 * 어떤 일을 하고 있습니까?	
 * @memberof Octree
 * @param cesium_cullingVolume 변수
 * @param result_octreesArray 변수
 * @param cesium_boundingSphere_scratch 변수
 */
Octree.prototype.getFrustumVisibleOctrees = function(cesium_cullingVolume, result_octreesArray, cesium_boundingSphere_scratch) {
	if(this.subOctrees_array.length == 0 && this._compRefsList_Array.length == 0) // For use with ifc buildings.***
		return;
	
    // this function has Cesium dependence.***
    if(result_octreesArray == undefined)
	    result_octreesArray = [];
  
    if(cesium_boundingSphere_scratch == undefined)
	    cesium_boundingSphere_scratch = new Cesium.BoundingSphere(); // Cesium dependency.***
  
    cesium_boundingSphere_scratch.center.x = this.centerPos.x;
    cesium_boundingSphere_scratch.center.y = this.centerPos.y;
    cesium_boundingSphere_scratch.center.z = this.centerPos.z;
  
    if(this.subOctrees_array.length == 0)
    {
	    //cesium_boundingSphere_scratch.radius = this.getRadiusAprox()*0.7;
		cesium_boundingSphere_scratch.radius = this.getRadiusAprox();
    }
    else{
	    cesium_boundingSphere_scratch.radius = this.getRadiusAprox();
    }
  
    var frustumCull = cesium_cullingVolume.computeVisibility(cesium_boundingSphere_scratch);
	if(frustumCull == Cesium.Intersect.INSIDE ) 
	{
		//result_octreesArray.push(this);
		this.getAllSubOctrees(result_octreesArray);
	}
	else if(frustumCull == Cesium.Intersect.INTERSECTING  ) 
	{
		if(this.subOctrees_array.length == 0 && this.neoRefsList_Array.length > 0) // original, good.***
		{
			result_octreesArray.push(this);
		}
		else
		{
			for(var i=0; i<this.subOctrees_array.length; i++ )
			{
				this.subOctrees_array[i].getFrustumVisibleOctrees(cesium_cullingVolume, result_octreesArray, cesium_boundingSphere_scratch);
			}
		}
	}
  // else if(frustumCull == Cesium.Intersect.OUTSIDE) => do nothing.***
};
  

/**
 * 어떤 일을 하고 있습니까?
 * @memberof Octree
 * @param eye_x 변수
 * @param eye_y 변수
 * @param eye_z 변수
 */
Octree.prototype.setSquareDistToEye = function(eye_x, eye_y, eye_z) {
	this.squareDistToEye = (this.centerPos.x - eye_x)*(this.centerPos.x - eye_x) + 
							(this.centerPos.y - eye_y)*(this.centerPos.y - eye_y) + 
							(this.centerPos.z - eye_z)*(this.centerPos.z - eye_z) ;
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof Octree
 * @param octreesArray 변수
 * @param octree 변수
 * @returns result_idx
 */
Octree.prototype.getIndexToInsertBySquaredDistToEye = function(octreesArray, octree) {
	// lineal implementation. In the future use dicotomic search technique.***
	var finished = false;
	var octrees_count = octreesArray.length;
	var i=0;
	var result_idx = 0;
	  
	while(!finished && i<octrees_count) {
		if(octreesArray[i].squareDistToEye > octree.squareDistToEye) {
			result_idx = i;
			finished = true;
		}
		i++;
	}
	if(!finished) {
		result_idx = octrees_count;
	}
	  
	return result_idx;
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof Octree
 * @param result_octreesArray 변수
 * @param octree 변수
 * @param eye_x 변수
 * @param eye_y 변수
 * @param eye_z 변수
 */
Octree.prototype.putOctreeInEyeDistanceSortedArray = function(result_octreesArray, octree, eye_x, eye_y, eye_z) {
	// sorting is from minDist to maxDist.***
	// http://stackoverflow.com/questions/586182/how-to-insert-an-item-into-an-array-at-a-specific-index
				
	var insert_idx= this.getIndexToInsertBySquaredDistToEye(result_octreesArray, octree);
		
	result_octreesArray.splice(insert_idx, 0, octree);
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof Octree
 * @param result_octreesArray 변수
 */
Octree.prototype.getAllSubOctrees = function(result_octreesArray) {
	if(result_octreesArray == undefined)
		result_octreesArray = [];
	  
	if(this.subOctrees_array.length > 0) {
		for(var i=0; i<this.subOctrees_array.length; i++) {
			this.subOctrees_array[i].getAllSubOctrees(result_octreesArray);
		}
	} else {
		if(this._compRefsList_Array.length > 0)
			result_octreesArray.push(this); // there are only 1.***
		else if(this.neoRefsList_Array.length > 0)
			result_octreesArray.push(this); // there are only 1.***
	}
};