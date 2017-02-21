'use strict';

/**
 * 어떤 일을 하고 있습니까?
 * @class OcclusionCullingOctreeCell
 * @param occlusionCullingOctree_Cell_Owner 변수
 */
var OcclusionCullingOctreeCell = function(occlusionCullingOctree_Cell_Owner) {
	if(!(this instanceof OcclusionCullingOctreeCell)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}
	
	this._ocCulling_Cell_owner = occlusionCullingOctree_Cell_Owner;
	this._minX = 0.0;
	this._maxX = 0.0;
	this._minY = 0.0;
	this._maxY = 0.0;
	this._minZ = 0.0;
	this._maxZ = 0.0;
	this._indicesArray = []; // Visible objects indices.***
	this._subBoxesArray = [];

	this._indicesUInt32Array = [];
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof OcclusionCullingOctreeCell
 * @returns subBox
 */
OcclusionCullingOctreeCell.prototype.newSubBox = function() {
	var subBox = new OcclusionCullingOctreeCell(this);
	this._subBoxesArray.push(subBox);
	return subBox;
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof OcclusionCullingOctreeCell
 */
OcclusionCullingOctreeCell.prototype.create8SubBoxes = function() {
	this._subBoxesArray.length = 0; // reset the array.***
	
	for(var i=0; i<8; i++)
	{
		this.newSubBox();
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof OcclusionCullingOctreeCell
 * @param min_x 변수
 * @param max_x 변수
 * @param min_y 변수
 * @param max_y 변수
 * @param min_z 변수
 * @param max_z 변수
 */
OcclusionCullingOctreeCell.prototype.setDimensions = function(min_x, max_x, min_y, max_y, min_z, max_z) {
	this._minX = min_x;
	this._maxX = max_x;
	this._minY = min_y;
	this._maxY = max_y;
	this._minZ = min_z;
	this._maxZ = max_z;
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof OcclusionCullingOctreeCell
 */
OcclusionCullingOctreeCell.prototype.setSizesSubBoxes = function() {
	// Bottom                      Top
	// |----------|----------|     |----------|----------|
	// |          |          |     |          |          |       Y
	// |    3     |    2     |	   |    7     |    6     |       ^
	// |          |          |     |          |          |       |
	// |----------|----------|     |----------|----------|       |
	// |          |          |     |          |          |       |
	// |     0    |     1    |     |    4     |    5     |       |
	// |          |          |     |          |          |       -----------------> X
	// |----------|----------|     |----------|----------|  
	
	if(this._subBoxesArray.length > 0)
	{
		var half_x= (this._maxX + this._minX)/2.0;
		var half_y= (this._maxY + this._minY)/2.0;
		var half_z= (this._maxZ + this._minZ)/2.0;
		
		this._subBoxesArray[0].setDimensions(this._minX, half_x,   this._minY, half_y,   this._minZ, half_z);
		this._subBoxesArray[1].setDimensions(half_x, this._maxX,   this._minY, half_y,   this._minZ, half_z);
		this._subBoxesArray[2].setDimensions(half_x, this._maxX,   half_y, this._maxY,   this._minZ, half_z);
		this._subBoxesArray[3].setDimensions(this._minX, half_x,   half_y, this._maxY,   this._minZ, half_z);

		this._subBoxesArray[4].setDimensions(this._minX, half_x,   this._minY, half_y,   half_z, this._maxZ);
		this._subBoxesArray[5].setDimensions(half_x, this._maxX,   this._minY, half_y,   half_z, this._maxZ);
		this._subBoxesArray[6].setDimensions(half_x, this._maxX,   half_y, this._maxY,   half_z, this._maxZ);
		this._subBoxesArray[7].setDimensions(this._minX, half_x,   half_y, this._maxY,   half_z, this._maxZ);
		
		for(var i=0; i<this._subBoxesArray.length; i++)
		{
			this._subBoxesArray[i].setSizesSubBoxes();
		}
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof OcclusionCullingOctreeCell
 * @param x 변수
 * @param y 변수
 * @param z 변수
 * @returns intersects
 */
OcclusionCullingOctreeCell.prototype.intersectsWithPoint3D = function(x, y, z) {
	var intersects = false;
	
	if(x>this._minX && x<this._maxX)
	{
		if(y>this._minY && y<this._maxY)
		{
			if(z>this._minZ && z<this._maxZ)
			{
				intersects = true;
			}
		}
	}
	
	return intersects;
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof OcclusionCullingOctreeCell
 * @param x 변수
 * @param y 변수
 * @param z 변수
 * @returns intersectedSubBox
 */
OcclusionCullingOctreeCell.prototype.getIntersectedSubBoxByPoint3D = function(x, y, z) {
	var intersectedSubBox = null;
	
	if(this._ocCulling_Cell_owner == null)
	{
		// This is the mother_cell.***
		if(!this.intersectsWithPoint3D(x, y, z))
		{
			return null;
		}
	}
	
	var subBoxes_count = this._subBoxesArray.length;
	if(subBoxes_count > 0)
	{
		var center_x = (this._minX + this._maxX)/2.0;
		var center_y = (this._minY + this._maxY)/2.0;
		var center_z = (this._minZ + this._maxZ)/2.0;
		
		var intersectedSubBox_aux = null;
		var intersectedSubBox_idx;
		
		if(x<center_x)
		{
			// Here are the boxes number 0, 3, 4, 7.***
			if(y<center_y)
			{
				// Here are 0, 4.***
				if(z<center_z) intersectedSubBox_idx = 0;
				else intersectedSubBox_idx = 4;
			}
			else
			{
				// Here are 3, 7.***
				if(z<center_z) intersectedSubBox_idx = 3;
				else intersectedSubBox_idx = 7;
			}
		}
		else 
		{
			// Here are the boxes number 1, 2, 5, 6.***
			if(y<center_y)
			{
				// Here are 1, 5.***
				if(z<center_z) intersectedSubBox_idx = 1;
				else intersectedSubBox_idx = 5;
			}
			else
			{
				// Here are 2, 6.***
				if(z<center_z) intersectedSubBox_idx = 2;
				else intersectedSubBox_idx = 6;
			}
		}
		
		intersectedSubBox_aux = this._subBoxesArray[intersectedSubBox_idx];
		intersectedSubBox = intersectedSubBox_aux.getIntersectedSubBoxByPoint3D(x, y, z);
		
	}
	else
	{
		intersectedSubBox = this;
	}
	
	return intersectedSubBox;
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof OcclusionCullingOctreeCell
 * @param eye_x 변수
 * @param eye_y 변수
 * @param eye_z 변수
 * @param result_visibleIndicesArray 변수
 * @returns result_visibleIndicesArray
 */
OcclusionCullingOctreeCell.prototype.getIndicesVisiblesForEye = function(eye_x, eye_y, eye_z, result_visibleIndicesArray) {
	var intersectedSubBox = this.getIntersectedSubBoxByPoint3D(eye_x, eye_y, eye_z);
	
	if(intersectedSubBox != null && intersectedSubBox._indicesArray.length > 0)
	{
		result_visibleIndicesArray = intersectedSubBox._indicesArray;
	}
	
	return result_visibleIndicesArray;
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof OcclusionCullingOctreeCell
 * @param expansionDist 변수
 */
OcclusionCullingOctreeCell.prototype.expandBox = function(expansionDist) {
	this._minX -= expansionDist;
	this._maxX += expansionDist;
	this._minY -= expansionDist;
	this._maxY += expansionDist;
	this._minZ -= expansionDist;
	this._maxZ += expansionDist;
};

/**
 * 어떤 일을 하고 있습니까?
 * @memberof OcclusionCullingOctreeCell
 * @param arrayBuffer 변수
 * @param bytes_readed 변수
 * @param f4dReaderWriter 변수
 * @returns bytes_readed
 */
OcclusionCullingOctreeCell.prototype.parseArrayBuffer = function(arrayBuffer, bytes_readed, f4dReaderWriter) {
	// Important note: this is the version of neoGeometry.***
	// Important note: this is the version of neoGeometry.***
	// Important note: this is the version of neoGeometry.***
	var is_mother_cell = f4dReaderWriter.readInt8(arrayBuffer, bytes_readed, bytes_readed+1); bytes_readed += 1;
	if(is_mother_cell)
	{
		// read the mother dimensions.***
		var minX = f4dReaderWriter.readFloat32(arrayBuffer, bytes_readed, bytes_readed+4); bytes_readed += 4;
		var maxX = f4dReaderWriter.readFloat32(arrayBuffer, bytes_readed, bytes_readed+4); bytes_readed += 4;
		var minY = f4dReaderWriter.readFloat32(arrayBuffer, bytes_readed, bytes_readed+4); bytes_readed += 4;
		var maxY = f4dReaderWriter.readFloat32(arrayBuffer, bytes_readed, bytes_readed+4); bytes_readed += 4;
		var minZ = f4dReaderWriter.readFloat32(arrayBuffer, bytes_readed, bytes_readed+4); bytes_readed += 4;
		var maxZ = f4dReaderWriter.readFloat32(arrayBuffer, bytes_readed, bytes_readed+4); bytes_readed += 4;
		
		this.setDimensions(minX, maxX, minY, maxY, minZ, maxZ);
	}
	else{
		// do nothing.***
	}
	
	var subBoxes_count = f4dReaderWriter.readUInt32(arrayBuffer, bytes_readed, bytes_readed+4); bytes_readed += 4;
	
	if(subBoxes_count == 0)
	{
		var objects_count = f4dReaderWriter.readUInt32(arrayBuffer, bytes_readed, bytes_readed+4); bytes_readed += 4;
		for(var i=0; i<objects_count; i++)
		{
			var objects_idxInList = f4dReaderWriter.readUInt32(arrayBuffer, bytes_readed, bytes_readed+4); bytes_readed += 4;
			this._indicesArray.push(objects_idxInList);
		}
	}
	else{
		for(var i=0; i<subBoxes_count; i++)
		{
			var subOcclusionBox = this.newSubBox();
			bytes_readed = subOcclusionBox.parseArrayBuffer(arrayBuffer, bytes_readed, f4dReaderWriter);
		}
	}
	
	return bytes_readed;
	
};
	
/**
 * 어떤 일을 하고 있습니까?
 * @class OcclusionCullingOctree
 */
var OcclusionCullingOctree = function() {
	if(!(this instanceof OcclusionCullingOctree)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}
	
	this._ocCulling_box = new OcclusionCullingOctreeCell(null);
	this._infinite_ocCulling_box = new OcclusionCullingOctreeCell(null);
};