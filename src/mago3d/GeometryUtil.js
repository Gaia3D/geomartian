'use strict';

/**
 * 어떤 일을 하고 있습니까?
 * @class ByteColor
 */
var ByteColor = function() {
	if(!(this instanceof ByteColor)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this._byte_r = 0;
	this._byte_g = 0;
	this._byte_b = 0;
	this._byte_alfa = 255;
};

/**
 * 어떤 일을 하고 있습니까?
 */
ByteColor.prototype.destroy = function() {
	this._byte_r = null;
	this._byte_g = null;
	this._byte_b = null;
	this._byte_alfa = null;
};

/**
 * 어떤 일을 하고 있습니까?
 * @param byteRed 변수
 * @param byteGreen 변수
 * @param byteBlue 변수
 */
ByteColor.prototype.set = function(byteRed, byteGreen, byteBlue) {
	this._byte_r = byteRed;
	this._byte_g = byteGreen;
	this._byte_b = byteBlue;
};

/**
* 어떤 일을 하고 있습니까?
* @class Point2D
*/
var Point2D = function() {
	if(!(this instanceof Point2D)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this.x = 0.0;
	this.y = 0.0;
	this._idx_in_list; // delete this.***
};

/**
 * 어떤 일을 하고 있습니까?
 * @class Point3DAux
 */
var Point3DAux = function() {
	if(!(this instanceof Point3DAux)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this.x = 0.0;
	this.y = 0.0;
	this.z = 0.0;
	//this._idx_in_list;
};

/**
 * 어떤 일을 하고 있습니까?
 * @class TTriangle
 */
var TTriangle = function() {
	if(!(this instanceof TTriangle)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this.m_vertex_1;
	this.m_vertex_2;
	this.m_vertex_3;
};

/**
 * 어떤 일을 하고 있습니까?
 * @param vtx_1 변수
 * @param vtx_2 변수
 * @param vtx_3 변수
 */
TTriangle.prototype.setVertices = function(vtx_1, vtx_2, vtx_3) {
	this.m_vertex_1 = vtx_1;
	this.m_vertex_2 = vtx_2;
	this.m_vertex_3 = vtx_3;
};

/**
 * 어떤 일을 하고 있습니까?
 */
TTriangle.prototype.invert = function() {
	var vertexAux = this.m_vertex_2;
	this.m_vertex_2 = this.m_vertex_3;
	this.m_vertex_3 = vertexAux;
};

/**
 * 어떤 일을 하고 있습니까?
 * @class TTrianglesList
 */
var TTrianglesList = function() {
	if(!(this instanceof TTrianglesList)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this.tTrianglesArray = [];
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns tTri
 */
TTrianglesList.prototype.newTTriangle = function() {
	var tTri = new TTriangle();
	this.tTrianglesArray.push(tTri);
	return tTri;
};

/**
 * 어떤 일을 하고 있습니까?
 */
TTrianglesList.prototype.invertTrianglesSense= function() {
	for(var i=0, tri_count = this.tTrianglesArray.length; i<tri_count; i++) {
		this.tTrianglesArray[i].invert();
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @param idx 변수
 * @returns tTrianglesArray[idx]
 */
TTrianglesList.prototype.getTTriangle = function(idx) {
	if(idx >=0 && idx < this.tTrianglesArray.length) {
		return this.tTrianglesArray[idx];
	} else{
		return undefined;
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @class TTrianglesMatrix
 */
var TTrianglesMatrix = function() {
	if(!(this instanceof TTrianglesMatrix)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this.tTrianglesListsArray = [];
	// SCRATX.*********************
	this.totalTTrianglesArraySC = [];
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns tTrianglesList
 */
TTrianglesMatrix.prototype.newTTrianglesList = function() {
	var tTrianglesList = new TTrianglesList();
	this.tTrianglesListsArray.push(tTrianglesList);
	return tTrianglesList;
};

/**
 * 어떤 일을 하고 있습니까?
 */
TTrianglesMatrix.prototype.invertTrianglesSense = function() {
	for(var i=0, tTriLists_count = this.tTrianglesListsArray.length; i<tTriLists_count; i++) {
		this.tTrianglesListsArray[i].invertTrianglesSense();
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @param resultTotalTTrianglesArray 변수
 * @returns resultTotalTTrianglesArray
 */
TTrianglesMatrix.prototype.getTotalTTrianglesArray = function(resultTotalTTrianglesArray) {
	for(var i=0, tTriLists_count = this.tTrianglesListsArray.length; i<tTriLists_count; i++) {
		for(var j=0, tTriangles_count = this.tTrianglesListsArray[i].tTrianglesArray.length; j<tTriangles_count; j++) {
			var tTriangle = this.tTrianglesListsArray[i].getTTriangle(j);
			resultTotalTTrianglesArray.push(tTriangle);
		}
	}

	return resultTotalTTrianglesArray;
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns shortArray
 */
TTrianglesMatrix.prototype.getVBOIndicesShortArray = function() {
	this.totalTTrianglesArraySC.length = 0;
	this.totalTTrianglesArraySC = this.getTotalTTrianglesArray(this.totalTTrianglesArraySC);

	var tTriangle;
	var shortArray = new Uint16Array(tTriangles_count*3);
	for(var i=0, tTriangles_count = this.totalTTrianglesArraySC.length; i<tTriangles_count; i++) {
		tTriangle = this.totalTTrianglesArraySC[i];
		shortArray[i*3] = tTriangle.m_vertex_1.m_idx_inList;
		shortArray[i*3+1] = tTriangle.m_vertex_2.m_idx_inList;
		shortArray[i*3+2] = tTriangle.m_vertex_3.m_idx_inList;
	}

	return shortArray;
};






/**
 * 어떤 일을 하고 있습니까?
 * @class VertexMatrix
 */
var VertexMatrix = function() {
	if(!(this instanceof VertexMatrix)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this.vertexListsArray = [];
	// SCTRATXH.******************
	this.totalVertexArraySC = [];
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns vertexList
 */
VertexMatrix.prototype.newVertexList = function() {
	var vertexList = new VertexList();
	this.vertexListsArray.push(vertexList);
	return vertexList;
};

/**
 * 어떤 일을 하고 있습니까?
 * @param idx 변수
 * @returns vertexListArray[idx]
 */
VertexMatrix.prototype.getVertexList = function(idx) {
	if(idx >= 0 && idx < this.vertexListsArray.length) {
		return this.vertexListsArray[idx];
	} else {
		return undefined;
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @param resultBox
 * @returns resultBox
 */
VertexMatrix.prototype.getBoundingBox = function(resultBox) {
	if(resultBox == undefined) resultBox = new BoundingBox();

	this.totalVertexArraySC.length = 0;
	this.totalVertexArraySC = this.getTotalVertexArray(this.totalVertexArraySC);
	for(var i=0, total_vertex_count = this.totalVertexArraySC.length; i<total_vertex_count; i++) {
		if(i==0) resultBox.setInit (this.totalVertexArraySC[i].point3d);
		else resultBox.addPoint3D(this.totalVertexArraySC[i].point3d);
	}
	return resultBox;
};

/**
 * 어떤 일을 하고 있습니까?
 */
VertexMatrix.prototype.setVertexIdxInList = function() {
	var idx_in_list = 0;
	for(var i=0, vertexLists_count = this.vertexListsArray.length; i<vertexLists_count; i++) {
		var vtxList = this.vertexListsArray[i];
		for(var j=0, vertex_count = vtxList.vertexArray.length; j<vertex_count; j++) {
			var vertex = vtxList.getVertex(j);
			vertex.m_idx_inList = idx_in_list;
			idx_in_list++;
		}
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns vertexCount
 */
VertexMatrix.prototype.getVertexCount = function() {
	var vertexCount = 0;
	for(var i=0, vertexLists_count = this.vertexListsArray.length; i<vertexLists_count; i++) {
		vertexCount += this.vertexListsArray[i].getVertexCount();
	}

	return vertexCount;
};

/**
 * 어떤 일을 하고 있습니까?
 * @param resultTotalVertexArray 변수
 * @returns resultTotalVertexArray
 */
VertexMatrix.prototype.getTotalVertexArray = function(resultTotalVertexArray) {
	for(var i=0, vertexLists_count = this.vertexListsArray.length; i<vertexLists_count; i++) {
		var vtxList = this.vertexListsArray[i];
		for(var j=0, vertex_count = vtxList.vertexArray.length; j<vertex_count; j++) {
			var vertex = vtxList.getVertex(j);
			resultTotalVertexArray.push(vertex);
		}
	}

	return resultTotalVertexArray;
};

/**
 * 어떤 일을 하고 있습니까?
 * @param resultFloatArray 변수
 * @returns resultFloatArray
 */
VertexMatrix.prototype.getVBOVertexColorFloatArray = function(resultFloatArray) {
	this.totalVertexArraySC.length = 0;
	this.totalVertexArraySC = this.getTotalVertexArray(this.totalVertexArraySC);

	var total_vertex_count = this.totalVertexArraySC.length;
	if(resultFloatArray == undefined) resultFloatArray = new Float32Array(total_vertex_count*6);

	for(var i=0; i<total_vertex_count; i++) {
		var vertex = this.totalVertexArraySC[i];
		resultFloatArray[i*6] = vertex.point3d.x;
		resultFloatArray[i*6+1] = vertex.point3d.y;
		resultFloatArray[i*6+2] = vertex.point3d.z;

		resultFloatArray[i*6+3] = vertex.color4.r;
		resultFloatArray[i*6+4] = vertex.color4.g;
		resultFloatArray[i*6+5] = vertex.color4.b;
	}

	return resultFloatArray;
};

/**
 * 어떤 일을 하고 있습니까?
 * @param resultFloatArray 변수
 * @returns resultFloatArray
 */
VertexMatrix.prototype.getVBOVertexColorRGBAFloatArray = function(resultFloatArray) {
	this.totalVertexArraySC.length = 0;
	this.totalVertexArraySC = this.getTotalVertexArray(this.totalVertexArraySC);

	var total_vertex_count = this.totalVertexArraySC.length;
	if(resultFloatArray == undefined) resultFloatArray = new Float32Array(total_vertex_count*7);

	for(var i=0; i<total_vertex_count; i++) {
		var vertex = this.totalVertexArraySC[i];
		resultFloatArray[i*7] = vertex.point3d.x;
		resultFloatArray[i*7+1] = vertex.point3d.y;
		resultFloatArray[i*7+2] = vertex.point3d.z;

		resultFloatArray[i*7+3] = vertex.color4.r;
		resultFloatArray[i*7+4] = vertex.color4.g;
		resultFloatArray[i*7+5] = vertex.color4.b;
		resultFloatArray[i*7+6] = vertex.color4.a;
	}

	return resultFloatArray;
};

/**
 * 어떤 일을 하고 있습니까?
 * @param resultFloatArray 변수
 * @returns resultFloatArray
 */
VertexMatrix.prototype.getVBOVertexFloatArray = function(resultFloatArray) {
	this.totalVertexArraySC.length = 0;
	this.totalVertexArraySC = this.getTotalVertexArray(this.totalVertexArraySC);

	var total_vertex_count = this.totalVertexArraySC.length;
	if(resultFloatArray == undefined) resultFloatArray = new Float32Array(total_vertex_count*3);

	for(var i=0; i<total_vertex_count; i++) {
		var vertex = this.totalVertexArraySC[i];
		resultFloatArray[i*3] = vertex.point3d.x;
		resultFloatArray[i*3+1] = vertex.point3d.y;
		resultFloatArray[i*3+2] = vertex.point3d.z;
	}

	return resultFloatArray;
};

/**
 * 어떤 일을 하고 있습니까?
 * @param dir_x 변수
 * @param dir_y 변수
 * @param dir_z 변수
 * @param distance 변수
 */
VertexMatrix.prototype.translateVertices = function(dir_x, dir_y, dir_z, distance) {
	for(var i=0, vertexLists_count = this.vertexListsArray.length; i<vertexLists_count; i++) {
		this.vertexListsArray[i].translateVertices(dir_x, dir_y, dir_z, distance);
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @param tTrianglesMatrix 변수
 */
VertexMatrix.prototype.makeTTrianglesLateralSidesLOOP = function(tTrianglesMatrix) {
	// condition: all the vertex lists must have the same number of vertex.***
	var vtxList_1;
	var vtxList_2;
	var tTrianglesList;
	var tTriangle_1;
	var tTriangle_2;
	var vertex_count = 0;
	for(var i=0, vertexLists_count = this.vertexListsArray.length; i<vertexLists_count-1; i++) {
		vtxList_1 = this.vertexListsArray[i];
		vtxList_2 = this.vertexListsArray[i+1];
		tTrianglesList = tTrianglesMatrix.newTTrianglesList();

		vertex_count = vtxList_1.vertexArray.length;
		for(var j=0; j<vertex_count; j++) {
			tTriangle_1 = tTrianglesList.newTTriangle();
			tTriangle_2 = tTrianglesList.newTTriangle();

			if(j == vertex_count-1) {
				tTriangle_1.setVertices(vtxList_1.getVertex(j), vtxList_2.getVertex(j), vtxList_2.getVertex(0));
				tTriangle_2.setVertices(vtxList_1.getVertex(j), vtxList_2.getVertex(0), vtxList_1.getVertex(0));
			} else {
				tTriangle_1.setVertices(vtxList_1.getVertex(j), vtxList_2.getVertex(j), vtxList_2.getVertex(j+1));
				tTriangle_2.setVertices(vtxList_1.getVertex(j), vtxList_2.getVertex(j+1), vtxList_1.getVertex(j+1));
			}
		}
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @param transformMatrix
 */
VertexMatrix.prototype.transformPointsByMatrix4 = function(transformMatrix) {
	for(var i=0, vertexLists_count = this.vertexListsArray.length; i<vertexLists_count; i++) {
		var vtxList = this.vertexListsArray[i];
		vtxList.transformPointsByMatrix4(transformMatrix);
	}
};



/**
 * 어떤 일을 하고 있습니까?
 * @class Polygon
 */
var Polygon = function() {
	if(!(this instanceof Polygon)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this.mPoint3DArray = [];
};

/**
 * 어떤 일을 하고 있습니까?
 * @param point3d 변수
 */
Polygon.prototype.addPoint3D = function(point3d) {
	this.mPoint3DArray.push(point3d);
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns point3d
 */
Polygon.prototype.newPoint3D = function() {
	var point3d = new Point3D();
	this.mPoint3DArray.push(point3d);
	return point3d;
};

/**
 * 어떤 일을 하고 있습니까?
 * @class TrianglesSurface
 */
var TrianglesSurface= function() {
	if(!(this instanceof TrianglesSurface)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this.mPoint3DArray = [];
	this.mTrianglesArray = [];
};

/**
 * 어떤 일을 하고 있습니까?
 */
TrianglesSurface.prototype.destroy = function() {
	// 1rst, destroy ftriangles.**********************************
	for(var i=0, ftriangles_count = this.mTrianglesArray.length; i<ftriangles_count; i++) {
		var ftriangle = this.mTrianglesArray[i];
		if(ftriangle!=null)ftriangle.destroy();
		ftriangle = null;
	}
	this.mTrianglesArray = null;

	// 2nd, destroy points3d.*************************************
	for(var i=0, points_count = this.mPoint3DArray.length; i<points_count; i++) {
		var point = this.mPoint3DArray[i];
		if(point!=null) point.destroy();
		point = null;
	}
	this.mPoint3DArray = null;
};

/**
 * 어떤 일을 하고 있습니까?
 * @param generalVBOArraysContainer 변수
 */
TrianglesSurface.prototype.getVertexColorsIndicesArrays = function(generalVBOArraysContainer) {
	var current_meshArrays = null;
	var meshArrays_count = generalVBOArraysContainer.meshArrays.length;
	if(meshArrays_count == 0) {
		current_meshArrays = generalVBOArraysContainer.newVertexColorIdx_Array();
	} else {
		current_meshArrays = generalVBOArraysContainer.meshArrays[meshArrays_count-1]; // take the last.***
	}

	// max unsigned short =  65,535
	var max_indices = 65000;

	for(var i=0, ftriangles_count = this.mTrianglesArray.length; i<ftriangles_count; i++) {
		if(current_meshArrays.mesh_vertices.length/3 >= max_indices) {
			current_meshArrays = generalVBOArraysContainer.newVertexColorIdx_Array();
		}

		var ftriangle = this.mTrianglesArray[i];
		var idx_p1 = ftriangle.m_point_1_idx;
		var idx_p2 = ftriangle.m_point_2_idx;
		var idx_p3 = ftriangle.m_point_3_idx;

		var color_p1 = ftriangle.m_color_1;
		var color_p2 = ftriangle.m_color_2;
		var color_p3 = ftriangle.m_color_3;

		var p1 = this.mPoint3DArray[idx_p1];
		var p2 = this.mPoint3DArray[idx_p2];
		var p3 = this.mPoint3DArray[idx_p3];

		// Point 1.***
		current_meshArrays.mesh_vertices.push(p1.x);
		current_meshArrays.mesh_vertices.push(p1.y);
		current_meshArrays.mesh_vertices.push(p1.z);
		current_meshArrays.mesh_tri_indices.push(current_meshArrays.mesh_vertices.length/3 - 1);
		current_meshArrays.mesh_colors.push(color_p1.r);
		current_meshArrays.mesh_colors.push(color_p1.g);
		current_meshArrays.mesh_colors.push(color_p1.b);

		// Point 2.***
		current_meshArrays.mesh_vertices.push(p2.x);
		current_meshArrays.mesh_vertices.push(p2.y);
		current_meshArrays.mesh_vertices.push(p2.z);
		current_meshArrays.mesh_tri_indices.push(current_meshArrays.mesh_vertices.length/3 - 1);
		current_meshArrays.mesh_colors.push(color_p2.r);
		current_meshArrays.mesh_colors.push(color_p2.g);
		current_meshArrays.mesh_colors.push(color_p2.b);

		// Point 3.***
		current_meshArrays.mesh_vertices.push(p3.x);
		current_meshArrays.mesh_vertices.push(p3.y);
		current_meshArrays.mesh_vertices.push(p3.z);
		current_meshArrays.mesh_tri_indices.push(current_meshArrays.mesh_vertices.length/3 - 1);
		current_meshArrays.mesh_colors.push(color_p3.r);
		current_meshArrays.mesh_colors.push(color_p3.g);
		current_meshArrays.mesh_colors.push(color_p3.b);
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @param general_VertexIdxVBO_ArraysContainer = 변수
 */
TrianglesSurface.prototype.getVertexIndicesArrays = function(general_VertexIdxVBO_ArraysContainer) {
	var current_meshArrays = null;
	var meshArrays_count = general_VertexIdxVBO_ArraysContainer._meshArrays.length;
	if(meshArrays_count == 0) {
		current_meshArrays = general_VertexIdxVBO_ArraysContainer.newVertexIdxArray();
	} else {
		current_meshArrays = general_VertexIdxVBO_ArraysContainer._meshArrays[meshArrays_count-1]; // take the last.***
	}

	// max unsigned short =  65,535
	var max_indices = 65000;

	var ftriangles_count = this.mTrianglesArray.length;
	var curr_vtx_count = current_meshArrays.mesh_vertices.length/3;
	for(var i=0, vtx_count = this.mPoint3DArray.length; i<vtx_count; i++) {
		var point = this.mPoint3DArray[i];
		current_meshArrays.mesh_vertices.push(point.x);
		current_meshArrays.mesh_vertices.push(point.y);
		current_meshArrays.mesh_vertices.push(point.z);
	}

	for(var i=0; i<ftriangles_count; i++) {
		if(current_meshArrays.mesh_vertices.length/3 >= max_indices) {
			current_meshArrays = general_VertexIdxVBO_ArraysContainer.newVertexIdxArray();
			curr_vtx_count = 0;
		}

		var ftriangle = this.mTrianglesArray[i];
		var idx_p1 = ftriangle.m_point_1_idx;
		var idx_p2 = ftriangle.m_point_2_idx;
		var idx_p3 = ftriangle.m_point_3_idx;

		current_meshArrays.mesh_tri_indices.push(idx_p1 + curr_vtx_count);
		current_meshArrays.mesh_tri_indices.push(idx_p2 + curr_vtx_count);
		current_meshArrays.mesh_tri_indices.push(idx_p3 + curr_vtx_count);
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @param general_VertexIdxVBO_ArraysContainer 변수
 */
TrianglesSurface.prototype.getVertexIndicesArraysOriginal = function(general_VertexIdxVBO_ArraysContainer) {
	var current_meshArrays = null;
	var meshArrays_count = general_VertexIdxVBO_ArraysContainer._meshArrays.length;
	if(meshArrays_count == 0) {
		current_meshArrays = general_VertexIdxVBO_ArraysContainer.newVertexIdxArray();
	} else {
		current_meshArrays = general_VertexIdxVBO_ArraysContainer._meshArrays[meshArrays_count-1]; // take the last.***
	}

	// max unsigned short =  65,535
	var max_indices = 65000;

	for(var i=0, ftriangles_count = this.mTrianglesArray.length; i<ftriangles_count; i++) {
		if(current_meshArrays.mesh_vertices.length/3 >= max_indices) {
			current_meshArrays = general_VertexIdxVBO_ArraysContainer.newVertexIdxArray();
		}

		var ftriangle = this.mTrianglesArray[i];
		var idx_p1 = ftriangle.m_point_1_idx;
		var idx_p2 = ftriangle.m_point_2_idx;
		var idx_p3 = ftriangle.m_point_3_idx;

		var p1 = this.mPoint3DArray[idx_p1];
		var p2 = this.mPoint3DArray[idx_p2];
		var p3 = this.mPoint3DArray[idx_p3];

		// Point 1.***
		current_meshArrays.mesh_vertices.push(p1.x);
		current_meshArrays.mesh_vertices.push(p1.y);
		current_meshArrays.mesh_vertices.push(p1.z);
		current_meshArrays.mesh_tri_indices.push(current_meshArrays.mesh_vertices.length/3 - 1);

		// Point 2.***
		current_meshArrays.mesh_vertices.push(p2.x);
		current_meshArrays.mesh_vertices.push(p2.y);
		current_meshArrays.mesh_vertices.push(p2.z);
		current_meshArrays.mesh_tri_indices.push(current_meshArrays.mesh_vertices.length/3 - 1);

		// Point 3.***
		current_meshArrays.mesh_vertices.push(p3.x);
		current_meshArrays.mesh_vertices.push(p3.y);
		current_meshArrays.mesh_vertices.push(p3.z);
		current_meshArrays.mesh_tri_indices.push(current_meshArrays.mesh_vertices.length/3 - 1);
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns point3d
 */
TrianglesSurface.prototype.newPoint3D = function() {
	var point3d = new Point3D();
	this.mPoint3DArray.push(point3d);
	return point3d;
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns ftriangle
 */
TrianglesSurface.prototype.newTriangle = function() {
	var ftriangle = new Triangle();
	this.mTrianglesArray.push(ftriangle);
	return ftriangle;
};

/**
 * 어떤 일을 하고 있습니까?
 * @param matrix4 변수
 * @returns transformedTrianglesSurface
 */
TrianglesSurface.prototype.getTransformedTrianglesSurface = function(matrix4) {
	var transformedTrianglesSurface = new TrianglesSurface();

	// 1) copy and transform the points3d.***
	for(var i=0, points_count = this.mPoint3DArray.length; i<points_count; i++) {
		var point3d = this.mPoint3DArray[i];
		var transformed_point = matrix4.transformPoint3D(point3d);
		transformedTrianglesSurface.mPoint3DArray.push(transformed_point);
	}

	// 2) copy the triangles.***
	for(var i=0, tri_count = this.mTrianglesArray.length; i<tri_count; i++) {
		var tri = this.mTrianglesArray[i];
		var transformed_tri = transformedTrianglesSurface.newTriangle();
		transformed_tri.setPoints3DIndices(tri.m_point_1_idx, tri.m_point_2_idx, tri.m_point_3_idx);
	}
	return transformedTrianglesSurface;
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns bb
 */
TrianglesSurface.prototype.getBoundingBox = function() {
	var points_count = this.mPoint3DArray.length;
	if(points_count == 0) return null;

	var bb = new BoundingBox();
	var first_point3d = this.mPoint3DArray[0];
	bb.setInit(first_point3d);

	for(var i=1; i<points_count; i++) {
		var point3d = this.mPoint3DArray[i];
		bb.addPoint3D(point3d);
	}

	return bb;
};

/**
 * 어떤 일을 하고 있습니까?
 * @class Fpolyhedron
 */
var Fpolyhedron= function() {
	if(!(this instanceof Fpolyhedron)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this.mFTrianglesSurfacesArray = [];
	this.mIFCEntityType = -1;
};

/**
 * 어떤 일을 하고 있습니까?
 */
Fpolyhedron.prototype.destroy = function() {
	for(var i=0, ftriSurfaces_count = this.mFTrianglesSurfacesArray.length; i<ftriSurfaces_count; i++) {
		var ftriangles_surface = this.mFTrianglesSurfacesArray[i];
		if(ftriangles_surface!=null)ftriangles_surface.destroy();
		ftriangles_surface = null;
	}
	this.mFTrianglesSurfacesArray = null;
	this.mIFCEntityType = null;
};

/**
 * 어떤 일을 하고 있습니까?
 * @param generalVBOArraysContainer 변수
 */
Fpolyhedron.prototype.getVertexColorsIndicesArrays = function(generalVBOArraysContainer) {
	for(var i=0, ftriSurfaces_count = this.mFTrianglesSurfacesArray.length; i<ftriSurfaces_count; i++) {
		var ftriangles_surface = this.mFTrianglesSurfacesArray[i];
		ftriangles_surface.getVertexColorsIndicesArrays(generalVBOArraysContainer);
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @param general_VertexIdxVBO_ArraysContainer 변수
 */
Fpolyhedron.prototype.getVertexIndicesArrays = function(general_VertexIdxVBO_ArraysContainer) {
	for(var i=0, ftriSurfaces_count = this.mFTrianglesSurfacesArray.length; i<ftriSurfaces_count; i++) {
		var ftriangles_surface = this.mFTrianglesSurfacesArray[i];
		ftriangles_surface.getVertexIndicesArrays(general_VertexIdxVBO_ArraysContainer);
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns ftrianglesSurface
 */
Fpolyhedron.prototype.newFTrianglesSurface = function() {
	var ftrianglesSurface = new TrianglesSurface();
	this.mFTrianglesSurfacesArray.push(ftrianglesSurface);
	return ftrianglesSurface;
};

/**
 * 어떤 일을 하고 있습니까?
 * @param matrix4
 * @returns transformedFPolyhedron
 */
Fpolyhedron.prototype.getTransformedFPolyhedron = function(matrix4) {
	var transformedFPolyhedron = new Fpolyhedron();
	for(var i=0, ftriSurfaces_count = this.mFTrianglesSurfacesArray.length; i<ftriSurfaces_count; i++) {
		var ftriangles_surface = this.mFTrianglesSurfacesArray[i];
		var transformed_ftriangles_surface = ftriangles_surface.getTransformedTrianglesSurface(matrix4);
		transformedFPolyhedron.mFTrianglesSurfacesArray.push(transformed_ftriangles_surface);
	}

	return transformedFPolyhedron;
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns bb
 */
Fpolyhedron.prototype.getBoundingBox = function() {
	var ftriSurfaces_count = this.mFTrianglesSurfacesArray.length;
	if(ftriSurfaces_count == 0) return null;

	var bb = null;
	for(var i=0; i<ftriSurfaces_count; i++) {
		var ftriangles_surface = this.mFTrianglesSurfacesArray[i];
		var current_bb = ftriangles_surface.getBoundingBox();
		if(bb == null) {
			if(current_bb != null) bb = current_bb;
		} else {
			if(current_bb != null) bb.addBox(current_bb);
		}
	}

	return bb;
};

/**
 * 어떤 일을 하고 있습니까?
 * @class FpolyhedronsList
 */
var FpolyhedronsList= function() {
	if(!(this instanceof FpolyhedronsList)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this.mFPolyhedronsArray = [];
};

/**
 * 어떤 일을 하고 있습니까?
 * @param generalVBOArraysContainer 변수
 */
FpolyhedronsList.prototype.getVertexColorsIndicesArrays = function(generalVBOArraysContainer) {
	for(var i=0, fpolyhedrons_count = this.mFPolyhedronsArray.length; i<fpolyhedrons_count; i++) {
		var fpolyhedron = this.mFPolyhedronsArray[i];
		if(fpolyhedron.mIFCEntityType != 27 && fpolyhedron.mIFCEntityType != 26) // 27 = ifc_space, 26 = ifc_windows.***
			fpolyhedron.getVertexColorsIndicesArrays(generalVBOArraysContainer);
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns fpolyhedron
 */
FpolyhedronsList.prototype.newFPolyhedron = function() {
	var fpolyhedron = new Fpolyhedron();
	this.mFPolyhedronsArray.push(fpolyhedron);
	return fpolyhedron;
};



/**
 * 어떤 일을 하고 있습니까?
 * @class Reference
 */
var Reference = function() {
	if(!(this instanceof Reference)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	// 1) Object ID.***
	this._id = 0;

	// 2) Block Idx.***
	this._block_idx = -1;

	// 3) Transformation Matrix.***
	this._matrix4 = new Matrix4();

	// 4) New. Only save the cache_key, and free geometry data.***
	//this._VBO_ByteColorsCacheKeys_Container = new VBOByteColorCacheKeysContainer(); // provisionally delete this.***

	// 4') may be only save the cache_key_idx.***
	this._VBO_ByteColorsCacheKeys_Container_idx = -1; // Test. Do this for possibly use with workers.***
};

/**
 * 어떤 일을 하고 있습니까?
 * @param matrix 변수
 */
Reference.prototype.multiplyTransformMatrix = function(matrix) {
	var multipliedMat = this._matrix4.getMultipliedByMatrix(matrix); // Original.***
	//var multipliedMat = matrix.getMultipliedByMatrix(this._matrix4); // Test.***
	this._matrix4 = multipliedMat;
};

/**
 * 어떤 일을 하고 있습니까?
 * @param blocksList 변수
 * @returns bb
 */
Reference.prototype.getBoundingBox = function(blocksList) {
	var block = blocksList.getBlock(this._block_idx);
	if(block == null) return null;

	var block_fpolyhedron = block._fpolyhedron;
	var transformed_fpolyhedron = block_fpolyhedron.getTransformedFPolyhedron(this._matrix4);
	var bb = transformed_fpolyhedron.getBoundingBox();
	return bb;
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns byteColorsSurface
 */
Reference.prototype.newByteColorsSurface = function() {
	var byteColorsSurface = new f4d_ByteColorsSurface();
	this._ByteColorsSurfacesList.push(byteColorsSurface);
	return byteColorsSurface;
};

/**
 * 어떤 일을 하고 있습니까?
 * @class CompoundReference
 */
var CompoundReference = function() {
	if(!(this instanceof CompoundReference)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this._referencesList = [];
};

/**
 * 어떤 일을 하고 있습니까?
 * @param blocksList 변수
 * @returns bb
 */
CompoundReference.prototype.getBoundingBox = function(blocksList) {
	var bb = null;
	for(var i=0, references_count = this._referencesList.length; i<references_count; i++) {
		var reference = this._referencesList[i];
		var current_bb = reference.getBoundingBox(blocksList);
		if(bb == null) {
			if(current_bb != null) bb = current_bb;
		} else {
			if(current_bb != null) bb.addBox(current_bb);
		}
	}

	return bb;
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns ref
 */
CompoundReference.prototype.newReference = function() {
	var ref = new Reference();
	this._referencesList.push(ref);
	return ref;
};

/**
 * 어떤 일을 하고 있습니까?
 * @class CompoundReferencesList
 */
var CompoundReferencesList = function() {
	if(!(this instanceof CompoundReferencesList)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this.name = "";
	this._compoundRefsArray = [];
	this._lodLevel = -1;
	this._ocCulling = new OcclusionCullingOctree();
	this._currentVisibleIndices = []; // Determined by occlusion culling.***
	this._currentVisibleIndicesSC = []; // Determined by occlusion culling.***
	this._currentVisibleIndicesSC_2 = []; // Determined by occlusion culling.***
};

/**
 * 어떤 일을 하고 있습니까?
 * @param eye_x 변수
 * @param eye_y 변수
 * @param eye_z 변수
 */
CompoundReferencesList.prototype.updateCurrentVisibleIndices = function(eye_x, eye_y, eye_z) {
	this._currentVisibleIndicesSC = this._ocCulling._infinite_ocCulling_box.getIndicesVisiblesForEye(eye_x, eye_y, eye_z, this._currentVisibleIndicesSC);
	this._currentVisibleIndicesSC_2 = this._ocCulling._ocCulling_box.getIndicesVisiblesForEye(eye_x, eye_y, eye_z, this._currentVisibleIndicesSC_2);
	this._currentVisibleIndices = this._currentVisibleIndicesSC.concat(this._currentVisibleIndicesSC_2);
};

/**
 * 어떤 일을 하고 있습니까?
 * @param eye_x 변수
 * @param eye_y 변수
 * @param eye_z 변수
 */
CompoundReferencesList.prototype.updateCurrentVisibleIndicesInterior = function(eye_x, eye_y, eye_z) {
	this._currentVisibleIndices = this._ocCulling._ocCulling_box.getIndicesVisiblesForEye(eye_x, eye_y, eye_z, this._currentVisibleIndices);
};

/**
 * 어떤 일을 하고 있습니까?
 * @param blocksList 변수
 * @returns bb
 */
CompoundReferencesList.prototype.getBoundingBox = function(blocksList) {
	var bb = null;
	for(var i=0, compRefs_count = this._compoundRefsArray.length; i<compRefs_count; i++) {
		var compRef = this._compoundRefsArray[i];
		var current_bb = compRef.getBoundingBox(blocksList);
		if(bb == null) {
			if(current_bb != null) bb = current_bb;
		} else {
			if(current_bb != null) bb.addBox(current_bb);
		}
	}
	return bb;
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns compRef
 */
CompoundReferencesList.prototype.newCompoundReference = function() {
	var compRef = new CompoundReference();
	this._compoundRefsArray.push(compRef);

	return compRef;
};

/**
 * 어떤 일을 하고 있습니까?
 * @param matrix 변수
 */
CompoundReferencesList.prototype.multiplyReferencesMatrices = function(matrix) {
	for(var i=0, compRefs_count = this._compoundRefsArray.length; i<compRefs_count; i++) {
		var compRef = this._compoundRefsArray[i];
		for(var j=0, refs_count = compRef._referencesList.length; j<refs_count; j++) {
			var reference = compRef._referencesList[j];
			reference.multiplyTransformMatrix(matrix);
		}
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @class CompoundReferencesListContainer
 */
var CompoundReferencesListContainer = function() {
	if(!(this instanceof CompoundReferencesListContainer)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this.compRefsListArray = [];
};

/**
 * 어떤 일을 하고 있습니까?
 * @param compoundReferenceList_name 변수
 * @param lodLevel 변수
 * @returns compoundRefList
 */
CompoundReferencesListContainer.prototype.newCompoundRefsList = function(compoundReferenceList_name, lodLevel) {
	var compoundRefList = new CompoundReferencesList();
	compoundRefList.name = compoundReferenceList_name;
	compoundRefList._lodLevel = lodLevel;
	this.compRefsListArray.push(compoundRefList);
	return compoundRefList;
};

/**
 * 어떤 일을 하고 있습니까?
 * @param eye_x 변수
 * @param eye_y 변수
 * @param eye_z 변수
 */
CompoundReferencesListContainer.prototype.updateCurrentVisibleIndicesOfLists = function(eye_x, eye_y, eye_z) {
	for(var i=0, compRefLists_count = this.compRefsListArray.length; i<compRefLists_count; i++) {
		this.compRefsListArray[i].updateCurrentVisibleIndices(eye_x, eye_y, eye_z);
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @param compRefListsName 변수
 * @returns result_compRefList
 */
CompoundReferencesListContainer.prototype.getCompRefListByName = function(compRefListsName) {
	var result_compRefList;
	var found = false;
	var compRefLists_count = this.compRefsListArray.length;
	var i=0;
	while(!found && i<compRefLists_count) {
		if(this.compRefsListArray[i].name == compRefListsName) {
			result_compRefList = this.compRefsListArray[i];
		}
		i++;
	}

	return result_compRefList;
};

  //VBO container.**************************************************************************************************************** //
  /*
  var VertexColorIdx_Arrays = function()
  {
	  this.mesh_vertices = [];
	  this.mesh_colors = [];
	  this.mesh_tri_indices = [];

	  this.MESH_VERTEX_cacheKey= null;
	  this.MESH_COLORS_cacheKey= null;
	  this.MESH_FACES_cacheKey= null;
  };

  var VBO_ArraysContainer = function()
  {
	  this.meshArrays = []; // "VertexColorIdx_Arrays" container.***
  };

  VBO_ArraysContainer.prototype.newVertexColorIdx_Array = function()
  {
	  var vci_array = new VertexColorIdx_Arrays();
	  this.meshArrays.push(vci_array);
	  return vci_array;
  };
  */

  // F4D Block - Reference with LightMapping.****************************************************************************** //
  // Vertices and Indices VBO.********************************************************************************************* //

/**
 * 어떤 일을 하고 있습니까?
 * @class VertexIdxArrays
 */
var VertexIdxArrays = function() {
	if(!(this instanceof VertexIdxArrays)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this.indicesCount = -1;

	this.MESH_VERTEX_cacheKey= null;
	this.MESH_FACES_cacheKey= null;
};

/**
 * 어떤 일을 하고 있습니까?
 * @class VertexIdxVBOArraysContainer
 */
var VertexIdxVBOArraysContainer = function() {
	if(!(this instanceof VertexIdxVBOArraysContainer)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this._meshArrays = [];
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns vi_array
 */
VertexIdxVBOArraysContainer.prototype.newVertexIdxArray = function() {
	var vi_array = new VertexIdxArrays();
	this._meshArrays.push(vi_array);
	return vi_array;
};

/**
* 어떤 일을 하고 있습니까?
* @class ByteColorsVBOArrays
*/
var ByteColorsVBOArrays = function() {
	if(!(this instanceof ByteColorsVBOArrays)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this.MESH_COLORS_cacheKey= null;
};

/**
 * 어떤 일을 하고 있습니까?
 * @class ByteColorsVBOArraysContainer
 */
var ByteColorsVBOArraysContainer = function() {
	if(!(this instanceof ByteColorsVBOArraysContainer)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this._meshArrays = [];
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns byteColors_array
 */
ByteColorsVBOArraysContainer.prototype.newByteColorsVBOArray = function() {
	var byteColors_array = new ByteColorsVBOArrays();
	this._meshArrays.push(byteColors_array);
	return byteColors_array;
};

/**
 * 어떤 일을 하고 있습니까?
 * @class VertexTexcoordsArrays
 */
var VertexTexcoordsArrays = function() {
	if(!(this instanceof VertexTexcoordsArrays)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this._vertices_array = [];
	this._texcoords_array = [];
};

/**
 * 어떤 일을 하고 있습니까?
 * @class VNTInterleavedCacheKeys
 */
var VNTInterleavedCacheKeys = function() {
	if(!(this instanceof VNTInterleavedCacheKeys)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this.VNT_cacheKey = null;
	this.indices_cacheKey = null;
	this._vertices_count = 0;
	this.indicesCount = 0;
};

/**
 * 어떤 일을 하고 있습니까?
 * @class VertexTexcoordsArraysCacheKeys
 */
var VertexTexcoordsArraysCacheKeys = function() {
	if(!(this instanceof VertexTexcoordsArraysCacheKeys)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this._verticesArray_cacheKey = null;
	this._texcoordsArray_cacheKey = null;
	this._vertices_count = 0;
	this._normalsArray_cacheKey = null;

	// arrayBuffers.***
	this.verticesArrayBuffer;
	this.texCoordsArrayBuffer;
	this.normalsArrayBuffer;
};

/**
 * 어떤 일을 하고 있습니까?
 * @class VertexTexcoordsArraysCacheKeysContainer
 */
var VertexTexcoordsArraysCacheKeysContainer = function() {
	if(!(this instanceof VertexTexcoordsArraysCacheKeysContainer)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this._vtArrays_cacheKeys_array = [];
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns vt_cacheKey
 */
VertexTexcoordsArraysCacheKeysContainer.prototype.newVertexTexcoordsArraysCacheKey = function() {
	var vt_cacheKey = new VertexTexcoordsArraysCacheKeys();
	this._vtArrays_cacheKeys_array.push(vt_cacheKey);
	return vt_cacheKey;
};

/**
 * 어떤 일을 하고 있습니까?
 * @class SimpleObject
 */
var SimpleObject = function() {
	if(!(this instanceof SimpleObject)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this._vtCacheKeys_container = new VertexTexcoordsArraysCacheKeysContainer();
};

/**
 * 어떤 일을 하고 있습니까?
 * @class SimpleStorey
 */
var SimpleStorey = function() {
	if(!(this instanceof SimpleStorey)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this._simpleObjects_array = [];
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns simpleObject
 */
SimpleStorey.prototype.newSimpleObject = function() {
	var simpleObject = new SimpleObject();
	this._simpleObjects_array.push(simpleObject);
	return simpleObject;
};

/**
 * 어떤 일을 하고 있습니까?
 * @class SimpleBuilding
 */
var SimpleBuilding = function() {
	if(!(this instanceof SimpleBuilding)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this._simpleStoreys_list = [];
	//this._simpleBuildingImage = new Image();
	this._simpleBuildingTexture;
	//this._simpleBuildingImage.onload = function() { handleTextureLoaded(this._simpleBuildingImage, this._simpleBuildingTexture); }
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns storey
 */
SimpleBuilding.prototype.newSimpleStorey = function() {
	var storey = new SimpleStorey();
	this._simpleStoreys_list.push(storey);
	return storey;
};

/**
 * 어떤 일을 하고 있습니까?
 * @class SimpleBuildingV1
 */
var SimpleBuildingV1 = function() {
	if(!(this instanceof SimpleBuildingV1)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	// this class is for faster rendering XDO converted projects.***
	this._simpleObjects_array = [];
	this._simpleBuildingTexture; // Mini texture. Possibly coincident with texture_3.***
	this._texture_0; // Biggest texture.***
	this._texture_1;
	this._texture_2;
	this._texture_3; // Smallest texture.***

	this.color;

	// arrayBuffers.***
	this.textureArrayBuffer; // use this for all textures.***

	// for SPEED TEST.***
	this._vnt_cacheKeys;
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns simpleObject
 */
SimpleBuildingV1.prototype.newSimpleObject = function() {
	var simpleObject = new SimpleObject();
	this._simpleObjects_array.push(simpleObject);
	return simpleObject;
};

/**
 * 어떤 일을 하고 있습니까?
 * @class Header
 */
var Header = function() {
	if(!(this instanceof Header)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this._f4d_version = 1;
	this._version = ""; // provisional for xdo.***
	this._type = -1;
	this._global_unique_id = "";

	this._latitude = 0.0;
	this._longitude = 0.0;
	this._elevation = 0.0;

	// Dont use this, if possible.***
	//this._yaw = 0.0;
	//this._pitch = 0.0;
	//this._roll = 0.0;

	this._boundingBox = new BoundingBox();
	this._octZerothBox = new BoundingBox(); // Provisionally...
	this._dataFileName = "";
	this._nailImageSize = 0;

	// Depending the bbox size, determine the LOD.***
	//this.bbox.maxLegth = 0.0;
	this.isSmall = false;

};

/**
 * 어떤 일을 하고 있습니까?
 * @class BRBuildingProject
 */
var BRBuildingProject = function() {
	if(!(this instanceof BRBuildingProject)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this._header = new Header();

	// Block-Reference version of buildingProjects.***
	this.move_matrix = new Float32Array(16); // PositionMatrix.***
	this.moveMatrixInv = new Float32Array(16); // Inverse of PositionMatrix.***
	this.buildingPosMatInv;
	this.buildingPosition;
	this.buildingPositionHIGH;
	this.buildingPositionLOW;

	// Blocks data.***************************************************************
	this._blocksList_Container = new BlocksListsContainer();
	this.createDefaultBlockReferencesLists();

	// Compound references data.**************************************************
	this.octree;
	this._compRefList_Container = new CompoundReferencesListContainer(); // Exterior objects lists.***

	// SimpleBuilding.***************
	this._simpleBuilding = new SimpleBuilding(); // ifc simple building.***
	this._simpleBuilding_v1;

	//this._boundingBox;
	this.radius_aprox;

	// Test for stadistic. Delete this in the future.***
	this._total_triangles_count = 0;

	// Test for use workers.*****************************************************************
	this._VBO_ByteColorsCacheKeysContainer_List = [];
	// End test for use workers.-------------------------------------------------------------

	// SCRATCH.*** SCRATCH.*** SCRATCH.*** SCRATCH.*** SCRATCH.*** SCRATCH.*** SCRATCH.*** SCRATCH.***
	this._visibleCompRefLists_scratch = new CompoundReferencesList();
	this.point3dScratch = new Point3D();
	this.point3dScratch2 = new Point3D();

	// Header, SimpleBuildingGeometry and nailImage path-strings.**********************************
	this._f4d_rawPathName = ""; // Use only this.***

	this._f4d_headerPathName = "";
	this._f4d_header_readed = false;
	this._f4d_header_readed_finished = false;

	this._f4d_simpleBuildingPathName = "";
	this._f4d_simpleBuilding_readed = false;
	this._f4d_simpleBuilding_readed_finished = false;

	this._f4d_nailImagePathName = "";
	this._f4d_nailImage_readed = false;
	this._f4d_nailImage_readed_finished = false;

	this._f4d_lod0ImagePathName = "";
	this._f4d_lod0Image_readed = false;
	this._f4d_lod0Image_readed_finished = false;
	this._f4d_lod0Image_exists = true;

	this._f4d_lod1ImagePathName = "";
	this._f4d_lod1Image_readed = false;
	this._f4d_lod1Image_readed_finished = false;
	this._f4d_lod1Image_exists = true;

	this._f4d_lod2ImagePathName = "";
	this._f4d_lod2Image_readed = false;
	this._f4d_lod2Image_readed_finished = false;
	this._f4d_lod2Image_exists = true;

	this._f4d_lod3ImagePathName = "";
	this._f4d_lod3Image_readed = false;
	this._f4d_lod3Image_readed_finished = false;
	this._f4d_lod3Image_exists = true;

	// for SPEEDTEST. Delete after test.***
	this._xdo_simpleBuildingPathName = "";
	this._xdo_simpleBuilding_readed = false;
	this._xdo_simpleBuilding_readed_finished = false;
};

/**
 * 어떤 일을 하고 있습니까?
 */
BRBuildingProject.prototype.calculateTotalTrianglesCount = function() {
	// This is temp function for debugging.***
	var compRefList;
	var compRefs_count = 0;
	var interior_compRefLists_count = _interiorCompRefList_Container.compRefsListArray.length;
	for(var i=0; i<interior_compRefLists_count; i++) {
		compRefList = _interiorCompRefList_Container.compRefsListArray[i];
		compRefs_count = compRefList._compoundRefsArray.length;
		for(var j=0; j<compRefs_count; j++) {

		}
	}
};

/**
 * 어떤 일을 하고 있습니까?
 * @param absolute_eye_x 변수
 * @param absolute_eye_y 변수
 * @param absolute_eye_z 변수
 * @returns point3dScratch2
 */
BRBuildingProject.prototype.getTransformedRelativeEyePositionToBuilding = function(absolute_eye_x, absolute_eye_y, absolute_eye_z) {
	// 1rst, calculate the relative eye position.***
	var buildingPosition = this.buildingPosition;
	var relative_eye_pos_x = absolute_eye_x - buildingPosition.x;
	var relative_eye_pos_y = absolute_eye_y - buildingPosition.y;
	var relative_eye_pos_z = absolute_eye_z - buildingPosition.z;

	if(this.buildingPosMatInv == undefined)
	{
		this.buildingPosMatInv = new Matrix4();
		this.buildingPosMatInv.setByFloat32Array(this.moveMatrixInv);
	}

	this.point3dScratch.set(relative_eye_pos_x, relative_eye_pos_y, relative_eye_pos_z);
	this.point3dScratch2 = this.buildingPosMatInv.transformPoint3D(this.point3dScratch, this.point3dScratch2);

	return this.point3dScratch2;
};

/**
 * 어떤 일을 하고 있습니까?
 * @param eye_X 변수
 * @param eye_y 변수
 * @param eye_z 변수
 * @returns _header._boundingBox.isPoint3dInside(eye_x, eye_y, eye_z)
 */
BRBuildingProject.prototype.isCameraInsideOfBuilding = function(eye_x, eye_y, eye_z) {
	return this._header._boundingBox.isPoint3dInside(eye_x, eye_y, eye_z);
};

/**
 * 어떤 일을 하고 있습니까?
 * @param eye_x 변수
 * @param eye_y 변수
 * @param eye_z 변수
 */
BRBuildingProject.prototype.updateCurrentVisibleIndicesExterior = function(eye_x, eye_y, eye_z) {
	this._compRefList_Container.updateCurrentVisibleIndicesOfLists(eye_x, eye_y, eye_z);
};

/**
 * 어떤 일을 하고 있습니까?
 * @param eye_x 변수
 * @param eye_y 변수
 * @param eye_z 변수
 * @returns _visibleCompRefLists_scratch
 */
BRBuildingProject.prototype.getVisibleCompRefLists = function(eye_x, eye_y, eye_z) {
	// Old. Delete this.!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	this._visibleCompRefLists_scratch = this._compRefList_Container.get_visibleCompRefObjectsList(eye_x, eye_y, eye_z, this._visibleCompRefLists_scratch);
	return this._visibleCompRefLists_scratch;
};

/**
 * 어떤 일을 하고 있습니까?
 * @param eye_x 변수
 * @param eye_y 변수
 * @param eye_z 변수
 * @returns _compRefList_Container.get_visibleCompRefObjectsList(eye_x, eye_y, eye_z)
 */
BRBuildingProject.prototype.getVisibleEXTCompRefLists = function(eye_x, eye_y, eye_z) {
	// Old. Delete this.!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	return this._compRefList_Container.get_visibleCompRefObjectsList(eye_x, eye_y, eye_z);
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns allCompRefLists
 */
BRBuildingProject.prototype.getAllCompRefLists = function() {
	var allCompRefLists = this._compRefList_Container.compRefsListArray.concat(this._interiorCompRefList_Container.compRefsListArray);
	return allCompRefLists;
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns radius_aprox
 */
BRBuildingProject.prototype.getRadiusAprox = function() {
	if(this._boundingBox == undefined) {
		var compRefList = this._compRefList_Container.getCompRefListByName("Ref_Skin1");
		if(compRefList) {
			this._boundingBox = new BoundingBox();
			this._boundingBox.minX = compRefList._ocCulling._ocCulling_box.minX;
			this._boundingBox.maxX = compRefList._ocCulling._ocCulling_box.maxX;
			this._boundingBox.minY = compRefList._ocCulling._ocCulling_box.minY;
			this._boundingBox.maxY = compRefList._ocCulling._ocCulling_box.maxY;
			this._boundingBox.minZ = compRefList._ocCulling._ocCulling_box.minZ;
			this._boundingBox.maxZ = compRefList._ocCulling._ocCulling_box.maxZ;

			this.radius_aprox = this._boundingBox.getMaxLength() / 2.0;
		}
	}

	return this.radius_aprox;
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns _boundingBox
 */
BRBuildingProject.prototype.getBoundingBox = function() {
 /*
	  if(this._boundingBox == undefined)
	  {
		  var boundingBox = null;

		  var compRefLists_count = this._compRefList_Container.compRefsListArray.length;
		  for(var i=0; i<compRefLists_count; i++)
		  {
			  var compRefList = this._compRefList_Container.compRefsListArray[i];
			  var blocksList = this._blocksList_Container.blocksListsArray[i];
			  var bb = compRefList.getBoundingBox(blocksList);
			  if(this._boundingBox == undefined)
			  {
				  if(bb != null)
				  this._boundingBox = bb;// malament. s'ha de multiplicar per el matrix de transformacio.***
			  }
			  else
			  {
				  if(bb != null)
					  this._boundingBox.addBox(bb);
			  }

		  }
	  }
	  */

	// Return the compReflList's occlussionCullingMotherBox.***
	if(this._boundingBox == undefined) {
		var compRefList = this._compRefList_Container.getCompRefListByName("Ref_Skin1");
		if(compRefList) {
			this._boundingBox = new BoundingBox();
			this._boundingBox.minX = compRefList._ocCulling._ocCulling_box._minX;
			this._boundingBox.maxX = compRefList._ocCulling._ocCulling_box.maxX;
			this._boundingBox.minY = compRefList._ocCulling._ocCulling_box.minY;
			this._boundingBox.maxY = compRefList._ocCulling._ocCulling_box.maxY;
			this._boundingBox.minZ = compRefList._ocCulling._ocCulling_box.minZ;
			this._boundingBox.maxZ = compRefList._ocCulling._ocCulling_box.maxZ;

			this.radius_aprox = this._boundingBox.getMaxLength() / 2.0;
		}
	}

	return this._boundingBox;
};

/**
 * 어떤 일을 하고 있습니까?
 */
BRBuildingProject.prototype.createDefaultBlockReferencesLists = function() {
	// Create 5 BlocksLists: "Blocks1", "Blocks2", "Blocks3", Blocks4" and "BlocksBone".***
	this._blocksList_Container.newBlocksList("Blocks1");
	this._blocksList_Container.newBlocksList("Blocks2");
	this._blocksList_Container.newBlocksList("Blocks3");

	this._blocksList_Container.newBlocksList("BlocksBone");
	this._blocksList_Container.newBlocksList("Blocks4");
};

/**
 * 어떤 일을 하고 있습니까?
 * @class PCloudMesh
 */
var PCloudMesh = function() {
	if(!(this instanceof PCloudMesh)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	// this is a temporary class to render mesh from point cloud.***
	this.move_matrix = new Float32Array(16); // PositionMatrix.***
	this.moveMatrixInv = new Float32Array(16); // Inverse of PositionMatrix.***
	this.pCloudPosMat_inv;
	this._pCloudPosition;
	this._pCloudPositionHIGH;
	this._pCloudPositionLOW;

	this._header = new Header();
	this.vbo_datas = new VBOVertexIdxCacheKeysContainer(); // temp.***

	this._f4d_rawPathName = "";

	this._f4d_headerPathName = "";
	this._f4d_header_readed = false;
	this._f4d_header_readed_finished = false;

	this._f4d_geometryPathName = "";
	this._f4d_geometry_readed = false;
	this._f4d_geometry_readed_finished = false;
};

/**
 * 어떤 일을 하고 있습니까?
 * @class BRBuildingProjectsList
 */
var BRBuildingProjectsList = function() {
	if(!(this instanceof BRBuildingProjectsList)) {
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this._BR_buildingsArray = [];
	this._boundingBox;
	this._pCloudMesh_array = []; // 1rst aproximation to the pointCloud data. Test.***
	//this.detailed_building; // Test.***
	//this.compRefList_array; // Test.***
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns br_buildingProject
 */
BRBuildingProjectsList.prototype.newBRProject = function() {
	//var titol = "holes a tothom"
	//var br_buildingProject = new BRBuildingProject({Titol : titol});
	var br_buildingProject = new BRBuildingProject();
	this._BR_buildingsArray.push(br_buildingProject);
	return br_buildingProject;
};

/**
 * 어떤 일을 하고 있습니까?
 * @returns _boundingBox
 */
BRBuildingProjectsList.prototype.getBoundingBox = function() {
	if(this._boundingBox == undefined) {
		var buildingProjects_count = this._BR_buildingsArray.length;
		for(var i=0; i<buildingProjects_count; i++) {
			var buildingProject = this._BR_buildingsArray[i];
			var current_bb = buildingProject.getBoundingBox();
			if(this._boundingBox == undefined) {
				if(current_bb != null)
					this._boundingBox = current_bb;
			}
			else
			{
				if(current_bb != null)
					this._boundingBox.addBox(current_bb);
			}
		}
	}
	return this._boundingBox;
};
