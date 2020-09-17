'use strict';

/**
 * The minimum elementary object that constitutes the surface.
 * 표면, Surface의 하위 개념.
 * 실린더를 예를 들면
 * 위 아래 뚜껑은 각각 하나의 Surface이자 face.
 * 옆면은 하나의 Surface에 수십개의 face가 모여있는 구조.
 * 
 * @exception {Error} Messages.CONSTRUCT_ERROR
 * 
 * @class Face
 * @constructor
 */
var Face = function() 
{
	if (!(this instanceof Face)) 
	{
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

	this._guid = createGuid();
	/**
	 * 페이스의 버텍스 리스트
	 * @type {Array.<Vertex>}
	 */
	this.vertexArray;

	/**
	 * 페이스의 임의의 버텍스의 hEdge.
	 * @type {HalfEdge}
	 */
	this.hEdge;

	/**
	 * 페이스의 플레인 노말 포인트.
	 * @type {Point3D}
	 */
	this.planeNormal;

	/**
	 * @deprecated not used
	 */
	this.surfaceOwner;
};

/**
 * delete all member.
 * Note: "Face" is NO-Owner of vertices, so, don't delete vertices. Only set as "undefined".
 * Note: "Face" is NO-Owner of hEdge, so, don't delete hEdge. Only set as "undefined".
 */
Face.prototype.deleteObjects = function()
{
	this.vertexArray = undefined;
	this.hEdge = undefined;
	
	if (this.planeNormal !== undefined)
	{
		this.planeNormal.deleteObjects();
		this.planeNormal = undefined;
	}
	
	this.surfaceOwner = undefined;
};
/**
 * get vertex array length
 * @returns {number} length of this vertexArray.
 */
Face.prototype.getVerticesCount = function()
{
	if (this.vertexArray === undefined)
	{ return 0; }

	return this.vertexArray.length;
};

/**
 * add vertex to this vertexArray
 * @param {Vertex} vertex
 */
Face.prototype.setVertexIdxInList = function()
{
	var verticesCount = this.getVerticesCount();
	for (var i=0; i<verticesCount; i++)
	{
		this.vertexArray[i].setIdxInList(i);
	}
};

/**
 * This function returns the halfEdge that has the "vertex" as startVertex.
 * @param {Vertex} vertex
 */
Face.prototype.getHalfEdgeOutingFromVertex = function(vertex)
{
	var find = false;
	var i=0;
	var currHedge = this.hEdge;
	var targetHedge;
	var vertexCount = this.getVerticesCount();
	while (!find && i<vertexCount)
	{
		if (currHedge.startVertex === vertex)
		{
			find = true;
			targetHedge = currHedge;
			break;
		}
		
		currHedge = currHedge.next;
		i++;
	}
	
	return targetHedge;
};

/**
 * add vertex to this vertexArray
 * @param {Vertex} vertex
 */
Face.prototype.changeVertex = function(idx, newVertex)
{
	var vertexCount = this.getVerticesCount();
	
	if (idx < 0 || idx >= vertexCount)
	{ return false; }
	
	var vertexToChange = this.vertexArray[idx];
	
	// must find the hedge that uses the "vertexToChange".
	var hedge = this.getHalfEdgeOutingFromVertex(vertexToChange);
	hedge.setStartVertex(newVertex);
	
	this.vertexArray[idx] = newVertex;
	
	return true;
};

/**
 * add vertex to this vertexArray
 * @param {Vertex} vertex
 */
Face.prototype.addVertex = function(vertex)
{
	if (this.vertexArray === undefined)
	{ this.vertexArray = []; }
	
	this.vertexArray.push(vertex);
};

/**
 * add vertex array to this vertexArray
 * @param {Array.<Vertex>} vertex
 */
Face.prototype.addVerticesArray = function(verticesArray)
{
	if (this.vertexArray === undefined)
	{ this.vertexArray = []; }
	
	Array.prototype.push.apply(this.vertexArray, verticesArray);
};

/**
 * get vertex
 * @param {number} idx array index.
 * @returns {Vertex|undefined}
 */
Face.prototype.getVertex = function(idx)
{
	if (this.vertexArray === undefined)
	{ return undefined; }

	return this.vertexArray[idx];
};

/**
 * reverse this vertex array.
 */
Face.prototype.reverseSense = function()
{
	this.vertexArray.reverse();
};

/**
 * set color all vertex in vertexArray.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} a
 */
Face.prototype.setColor = function(r, g, b, a)
{
	var vertex;
	var verticesCount = this.getVerticesCount();
	for (var i=0; i<verticesCount; i++)
	{
		vertex = this.getVertex(i);
		vertex.setColorRGBA(r, g, b, a);
	}
};

/**
 * get plane normal point. if this plane normal is undefined or not a number, calculate plane normal.
 * @returns {Point3D} this plane normal point.
 */
Face.prototype.getPlaneNormal = function()
{
	if (this.planeNormal === undefined || this.planeNormal.isNAN())
	{ 
		//this.calculateVerticesNormals(); 
		this.calculatePlaneNormal();
	} 
	
	return this.planeNormal;
};

/**
 * calculate plane normal point using vertex array.
 * @static
 * @param {Array.<Vertex>} vertexArray
 * @param {Point3D} resultPlaneNormal if this is undefined, set new Point3D instance.
 * @returns {Point3D}
 */
Face.calculatePlaneNormal = function(vertexArray, resultPlaneNormal)
{
	// Note: the vertexArray must be planar.
	if (resultPlaneNormal === undefined)
	{ resultPlaneNormal = new Point3D(); }

	resultPlaneNormal.set(0, 0, 0);
	var verticesCount = vertexArray.length;
	for (var i=0; i<verticesCount; i++)
	{
		var prevIdx = VertexList.getPrevIdx(i, vertexArray);
		var startVec = VertexList.getVector(prevIdx, vertexArray, undefined);
		var endVec = VertexList.getVector(i, vertexArray, undefined);
		
		startVec.unitary();
		endVec.unitary();
		
		if (startVec.isNAN() || endVec.isNAN())
		{ continue; }
		
		var crossProd = startVec.crossProduct(endVec, undefined); // Point3D.
		crossProd.unitary(); 
		if (crossProd.isNAN())
		{ continue; }
	
		var scalarProd = startVec.scalarProduct(endVec);
		
		var cosAlfa = scalarProd; // Bcos startVec & endVec are unitaries.
		if (cosAlfa > 1.0)
		{ cosAlfa = 1.0; }
		else if (cosAlfa < -1.0)
		{ cosAlfa = -1.0; }
		var alfa = Math.acos(cosAlfa);
		
		resultPlaneNormal.add(crossProd.x*alfa, crossProd.y*alfa, crossProd.z*alfa);
	}
	resultPlaneNormal.unitary();
	
	return resultPlaneNormal;
};

/**
 * calculate plane normal and set this plane normal.
 * @returns {Point3D} this plane normal point.
 * 
 * @see Face#calculatePlaneNormal
 */
Face.prototype.calculatePlaneNormal = function()
{
	// Note: face must be planar.
	this.planeNormal = Face.calculatePlaneNormal(this.vertexArray, this.planeNormal);
	return this.planeNormal;
};

/**
 * 각 버텍스들의 normal point를 face의 plane normal로 일괄 적용.
 * @param {Boolean} bForceRecalculatePlaneNormal if true, force execute calculatePlaneNormal.
 * 
 * @see Face#calculatePlaneNormal
 */
Face.prototype.calculateVerticesNormals = function(bForceRecalculatePlaneNormal)
{
	// This function calculates normals for concave faces.
	// Provisionally calculate the plane normal and assign to the vertices.
	var verticesCount = this.vertexArray.length;

	if (bForceRecalculatePlaneNormal !== undefined && bForceRecalculatePlaneNormal)
	{ this.calculatePlaneNormal(); }
	
	if (this.planeNormal === undefined)
	{ this.calculatePlaneNormal(); }
	//@TODO: Add dirty-flag not to copy the normal vector twice.
	
	var normal;
	var verticesCount = this.getVerticesCount();
	for (var i=0; i<verticesCount; i++)
	{
		//normal = this.vertexArray[i].getNormal();
		//normal.addPoint(this.planeNormal);
		//normal.unitary();
		this.vertexArray[i].setNormal(this.planeNormal.x, this.planeNormal.y, this.planeNormal.z);
	}
};

/**
 * Calculates the minimum distance between this face and the point3d.
 * @param {Point3D} point3d Point that this calculates the min distance to this face.
 * @returns {Number} the minimum distance between this face and the point3d.
 * 
 */
Face.prototype.calculateMinDistToPoint = function(point3d)
{
	// 1rst, must know if the projecti
};

/**
 * Get the texture coordinate by box projection
 */
Face.prototype.calculateTexCoordsByHeight = function(height, width)
{
	width = 3;

	var planeNormal = this.getPlaneNormal();
	var zAxix = new Point3D(0, 0, 1);
	var dotValue = zAxix.scalarProduct(planeNormal);
	var isCeil = dotValue > 0.9 ? true : false; 

	var horizontalDownEdge;
	var length = 0;
	var hel = this.getHalfEdgesLoop();
	for (var j=0, len=hel.length;j<len;j++)
	{
		var halfEdge = hel[j];
		var startV = halfEdge.getStartVertex();
		var startTexCoord = startV.getTexCoord();
		var endV = halfEdge.getEndVertex();
		var endTexCoord = endV.getTexCoord();
		
		var sPos = startV.getPosition();
		var ePos = endV.getPosition();

		var sz = sPos.z;
		var ez = ePos.z;

		if (isCeil)
		{
			startTexCoord.set(0, 0);
			endTexCoord.set(0, 0);
		}
		else 
		{
			if (sz < 0.5 && ez < 0.5) 
			{
				horizontalDownEdge = halfEdge;
				length = sPos.distToPoint(ePos);

				var s = length / width;
				var t = 0;

				startTexCoord.set(0, t);
				endTexCoord.set(s, t);
			}
			else if (sz > 0.5 && ez > 0.5) 
			{
				horizontalDownEdge = halfEdge;
				length = sPos.distToPoint(ePos);

				var s = length / width;
				var t = sz / height;

				startTexCoord.set(s, t);
				endTexCoord.set(0, t);
			}
		}
	}
};
/**
 * Get the texture coordinate by box projection
 */
Face.prototype.calculateTexCoordsBox = function(texCoordsBoundingBox)
{
	//CODE.boxFace = { "UNKNOWN" : 0, "LEFT" : 1, "RIGHT" : 2, "FRONT" : 3, "REAR"  : 4, "TOP" : 5, "BOTTOM" : 6 };
	// 1rst, must know the bestBoxFaceToProject of this face.
	var normal = this.getPlaneNormal();
	var bestBoxFaceToProject = Face.getBestCubeFaceToProject(normal);
	
	var minX = texCoordsBoundingBox.minX;
	var maxX = texCoordsBoundingBox.maxX;
	var minY = texCoordsBoundingBox.minY;
	var maxY = texCoordsBoundingBox.maxY;
	var minZ = texCoordsBoundingBox.minZ;
	var maxZ = texCoordsBoundingBox.maxZ;
	
	var xRange = maxX - minX;
	var yRange = maxY - minY;
	var zRange = maxZ - minZ;
	
	var vertexCount = this.getVerticesCount();
	
	if (bestBoxFaceToProject === CODE.boxFace.TOP)
	{
		for (var i=0; i<vertexCount; i++)
		{
			var vertex = this.getVertex(i);
			var position = vertex.getPosition();
			var texCoord = vertex.getTexCoord();
			
			var x = position.x;
			var y = position.y;
			var s = (x - minX) / xRange;
			var t = (y - minY) / yRange;

			texCoord.set(s, t);
		}
	}
	else if (bestBoxFaceToProject === CODE.boxFace.BOTTOM)
	{
		for (var i=0; i<vertexCount; i++)
		{
			var vertex = this.getVertex(i);
			var position = vertex.getPosition();
			var texCoord = vertex.getTexCoord();
			
			var x = position.x;
			var y = position.y;
			var s = (x - minX) / xRange;
			var t = (y - minY) / yRange;
			t = 1.0 - t;

			texCoord.set(s, t);
		}
	}
	else if (bestBoxFaceToProject === CODE.boxFace.FRONT)
	{
		for (var i=0; i<vertexCount; i++)
		{
			var vertex = this.getVertex(i);
			var position = vertex.getPosition();
			var texCoord = vertex.getTexCoord();
			
			var x = position.x;
			var z = position.z;
			var s = (x - minX) / xRange;
			var t = (z - minZ) / zRange;

			texCoord.set(s, t);
		}
	}
	else if (bestBoxFaceToProject === CODE.boxFace.REAR)
	{
		for (var i=0; i<vertexCount; i++)
		{
			var vertex = this.getVertex(i);
			var position = vertex.getPosition();
			var texCoord = vertex.getTexCoord();
			
			var x = position.x;
			var z = position.z;
			var s = (x - minX) / xRange;
			var t = (z - minZ) / zRange;
			t = 1.0 - t;

			texCoord.set(s, t);
		}
	}
	else if (bestBoxFaceToProject === CODE.boxFace.LEFT)
	{
		for (var i=0; i<vertexCount; i++)
		{
			var vertex = this.getVertex(i);
			var position = vertex.getPosition();
			var texCoord = vertex.getTexCoord();
			
			var y = position.y;
			var z = position.z;
			var t = (y - minY) / yRange;
			var s = (z - minZ) / zRange;

			texCoord.set(s, t);
		}
	}
	else if (bestBoxFaceToProject === CODE.boxFace.RIGHT)
	{
		for (var i=0; i<vertexCount; i++)
		{
			var vertex = this.getVertex(i);
			var position = vertex.getPosition();
			var texCoord = vertex.getTexCoord();
			
			var y = position.y;
			var z = position.z;
			var t = (y - minY) / yRange;
			var s = (z - minZ) / zRange;
			s = 1.0 - s;

			texCoord.set(s, t);
		}
	}
};

/**
 * 시작점과 끝점이 매우 가까울 경우 (거의 같은, 0.1mm보다 가까울때.) 끝점을 삭제.
 * "Uroborus" is an archaic motif of a snake biting its own tail.
 * "Uroborus"는 뱀이 자기 꼬리 먹고 있는 모양.
 * This function checks if the 1rst vertex & the last vertex are coincident. If are coincident then remove last one.
 * 
 * @see Point3D#isCoincidentToPoint
 */
Face.prototype.solveUroborus = function()
{
	// "Uroborus" is an archaic motif of a snake biting its own tail.
	// This function checks if the 1rst vertex & the last vertex are coincident. If are coincident then remove last one.
	var verticesCount = this.getVerticesCount();
	if (verticesCount < 3)
	{ return; }
	
	var vertex_str = this.getVertex(0);
	var vertex_end = this.getVertex(verticesCount - 1);
	
	var pos_str = vertex_str.point3d;
	var pos_end = vertex_end.point3d;
	var distError = 0.0001; // 0.1mm of error.
	
	if (pos_str.isCoincidentToPoint(pos_end, distError))
	{
		// remove the last vertex.
		this.vertexArray.pop();
	}
};

/**
 * 전체 Face 배열 중 동일한 Face 가 존재하는지를 알려준다.
 *
 */
Face.setTwinsFacesOfArray = function(facesArray)
{
	var face, face2;
	
	var facesCount = facesArray.length;
	for (var i=0; i<facesCount; i++)
	{
		face = facesArray[i];
		for (var j=i+1; j<facesCount; j++)
		{
			if (i !== j)
			{
				face2 = facesArray[j];
				face.setTwinFace(face2);
			}
		}
	}
};

/**
 * 표출하기 위해 최적의 plane 타입을 반환.
 * @static
 * @param {Point3D} normal
 * @returns {Number} 0 : plane-xy, 1 : plane-yz, 2: plane-xz
 */
Face.getBestFacePlaneToProject = function(normal)
{
	var best_plane = -1; //"unknown";

	var nx = Math.abs(normal.x);
	var ny = Math.abs(normal.y);
	var nz = Math.abs(normal.z);

	if ( nz > nx && nz >= ny )
 	{
 		best_plane = 0; //"xy";
 	}
 	else if ( nx >= ny && nx >= nz )
 	{
 		best_plane = 1; //"yz";
 	}
 	else if ( ny > nx && ny >= nz )
 	{
 		best_plane = 2; //"xz";
	}

	return best_plane;
};

Face.getBestCubeFaceToProject = function(normal)
{
	var cubeface = CODE.boxFace.UNKNOWN;
	var bestFacePlane = Face.getBestFacePlaneToProject(normal);

	if (bestFacePlane === 0) // xy.
	{
		// TOP or BOTTOM.***
		var nz = normal.z;
		if (nz > 0.0){ cubeface = CODE.boxFace.TOP; }
		else { cubeface = CODE.boxFace.BOTTOM; }
	}
	else if (bestFacePlane === 1) // yz.
	{
		// LEFT or RIGHT.***
		var nx = normal.x;
		if (nx > 0.0){ cubeface = CODE.boxFace.RIGHT; }
		else { cubeface = CODE.boxFace.LEFT; }
	}
	else if (bestFacePlane === 2) // xz.
	{
		// FRONT or REAR.***
		var ny = normal.y;
		if (ny > 0.0){ cubeface = CODE.boxFace.REAR; }
		else { cubeface = CODE.boxFace.FRONT; }
	}

	return cubeface;
};


/**
 * 버텍스 배열을 plane normal에 따라 polygon2d 형식으로 변환 후 반환.
 * @static
 * @param {Array.<Vertex>} vertexArray
 * @param {Point3D} normal
 * @param {Polygon2D} resultProjectedPolygon2d
 * @returns {Polygon2D}
 */
Face.getProjectedPolygon2D = function(vertexArray, normal, resultProjectedPolygon2d)
{
	// Create a temp polygon2d.
	if (resultProjectedPolygon2d === undefined)
	{ resultProjectedPolygon2d = new Polygon2D(); }
	
	if (resultProjectedPolygon2d.point2dList === undefined)
	{ resultProjectedPolygon2d.point2dList = new Point2DList(); }

	var point2dList = resultProjectedPolygon2d.point2dList;
	point2dList.pointsArray =  VertexList.getProjectedPoints2DArray(vertexArray, normal, point2dList.pointsArray);

	return resultProjectedPolygon2d;
};

/**
 * 오목 폴리곤들을 볼록 폴리곤들로 분리 후 반환.
 * concave to convex list.
 * @param {Array.<Triangle>} resultTrianglesArray
 * @returns {Array.<Triangle>}
 */
Face.prototype.getTessellatedTriangles = function(resultTrianglesArray)
{
	if (resultTrianglesArray === undefined)
	{ resultTrianglesArray = []; }

	var verticesCount = this.getVerticesCount();
	if (verticesCount <= 3)
	{
		// This is a triangle, so no need to tessellate.
		resultTrianglesArray = this.getTrianglesConvex(resultTrianglesArray);
		return resultTrianglesArray;
	}

	// 1rst, must project the face to a plane and process to tessellate in 2d.
	var normal = this.getPlaneNormal();

	// Create a temp polygon2d.
	var polygon2d = Face.getProjectedPolygon2D(this.vertexArray, normal, undefined);
	
	// Now, tessellate the polygon2D.
	// Before tessellate, we must know if there are concavePoints.
	var resultConcavePointsIdxArray;
	resultConcavePointsIdxArray = polygon2d.calculateNormal(resultConcavePointsIdxArray);
	
	var convexPolygonsArray = [];
	polygon2d.tessellate(resultConcavePointsIdxArray, convexPolygonsArray);
	
	// inside of "convexPolygonsArray" there are 1 or more convexPolygons result of tessellation of the polygon2d.

	this.calculateVerticesNormals();
	var convexPolygonsCount = convexPolygonsArray.length;
	for (var i=0; i<convexPolygonsCount; i++)
	{
		var convexPolygon = convexPolygonsArray[i];
		
		if (convexPolygon.point2dList.getPointsCount() === 0)
		{ continue; }
		
		var vertex0, vertex1, vertex2;
		var triangle;
		var point2d_0, point2d_1, point2d_2;
		var point2d_0 = convexPolygon.point2dList.getPoint(0);
		
		vertex0 = point2d_0.ownerVertex3d;
		var point2dCount = convexPolygon.point2dList.getPointsCount();
		for (var j=1; j<point2dCount-1; j++)
		{
			point2d_1 = convexPolygon.point2dList.getPoint(j);
			point2d_2 = convexPolygon.point2dList.getPoint(j+1);
			vertex1 = point2d_1.ownerVertex3d;
			vertex2 = point2d_2.ownerVertex3d;
			triangle = new Triangle(vertex0, vertex1, vertex2);
			
			resultTrianglesArray.push(triangle);
		}
	}
	//this.calculateVerticesNormals();
	return resultTrianglesArray;
};

/**
 * Note: to call this function, this-face must be CONVEX face.
 * 버텍스 배열의 첫번째 배열을 기준으로 삼각형 convex(Triangle)을 생성 후 배열에 담아 반환
 * @param {Array.<Triangle>} resultTrianglesArray undefined일 때, 배열로 초기화.
 * @returns {Array.<Triangle>|undefined} 기존 버텍스 배열이 undefined거나 비어있으면 매개변수 resultTrianglesArray 상태 그대로 반환.
 */
Face.prototype.getTrianglesConvex = function(resultTrianglesArray)
{
	// To call this method, the face MUST be convex.
	// To call this method, the face MUST be convex.
	if (this.vertexArray === undefined || this.vertexArray.length === 0)
	{ return resultTrianglesArray; }
	
	if (resultTrianglesArray === undefined)
	{ resultTrianglesArray = []; }
	
	var vertex0, vertex1, vertex2;
	var triangle;
	vertex0 = this.getVertex(0);
	var verticesCount = this.getVerticesCount();
	for (var i=1; i<verticesCount-1; i++)
	{
		vertex1 = this.getVertex(i);
		vertex2 = this.getVertex(i+1);
		triangle = new Triangle(vertex0, vertex1, vertex2);
		resultTrianglesArray.push(triangle);
	}
	
	return resultTrianglesArray;
};

/**
 * Face의 hedge 중 매개변수 hedge와 twin인 것이 있는지 유무 반환.
 * @param {HalfEdge} hedge 
 * @returns {Boolean}
 * 
 * @see HalfEdge#setTwin
 */
Face.prototype.setTwinHalfEdge = function(hedge)
{
	var twined = false;
	var finished = false;
	var startHEdge = this.hEdge;
	var currHEdge = this.hEdge;
	while (!finished)
	{
		if (currHEdge.setTwin(hedge))
		{ return true; }

		currHEdge = currHEdge.next;
		if (currHEdge === startHEdge)
		{ finished = true; }
	}
	return twined;
};

/**
 * Face의 frontier hedge 배열 반환.
 * @param {Array.<HalfEdge>} resultHedgesArray 
 * @returns {Array.<HalfEdge>}
 * 
 * @see HalfEdge#getHalfEdgesLoop
 * @see HalfEdge#isFrontier
 */
Face.prototype.getFrontierHalfEdges = function(resultHedgesArray)
{
	var hedgesArray = this.getHalfEdgesLoop(undefined);
	if (hedgesArray === undefined)
	{ return resultHedgesArray; }
	
	if (resultHedgesArray === undefined)
	{ resultHedgesArray = []; }

	var hedgesCount = hedgesArray.length;
	var hedge;
	for (var i=0; i<hedgesCount; i++)
	{
		hedge = hedgesArray[i];
		if (hedge.isFrontier())
		{
			resultHedgesArray.push(hedge);
		}
	}
	return resultHedgesArray;
};

/**
 * Face의 hedge 배열 반환.
 * @param {Array.<HalfEdge>} resultHedgesArray 
 * @returns {Array.<HalfEdge>}
 * 
 * @see HalfEdge#getHalfEdgesLoop
 */
Face.prototype.getHalfEdgesLoop = function(resultHedgesArray)
{
	if (this.hEdge === undefined)
	{ return resultHedgesArray; }
	
	resultHedgesArray = HalfEdge.getHalfEdgesLoop(this.hEdge, resultHedgesArray);
	return resultHedgesArray;
};

/**
 * 현재 Face와 매개변수 Face의 각각 hedge를 이용하여 twin hedge를 찾아서 twin 유무 반환
 * @param {Face} face Required. Must contain hEdge.
 * @returns {Boolean} is twin face.
 */
Face.prototype.setTwinFace = function(face)
{
	if (face === undefined)
	{ return false; }
	
	if (this.hEdge === undefined || face.hEdge === undefined)
	{ return false; }
	
	var hedgesArray = face.getHalfEdgesLoop(undefined);
	var hedgesCount = hedgesArray.length;
	var hedge;
	var twined = false;
	for (var i=0; i<hedgesCount; i++)
	{
		hedge = hedgesArray[i];
		if (this.setTwinHalfEdge(hedge))
		{ twined = true; }
	}
	
	return twined;
};

/**
 * 버텍스 배열의 각각 버텍스의 hedge를 설정(next hedge도 설정) 후 배열에 담아서 반환. 
 * 반환배열의 첫번째 요소(HalfEdge, resultHalfEdgesArray[0])는 this.hEdge로 설정
 * @param {Array.<HalfEdge>|undefined} resultHalfEdgesArray
 * @returns {Array.<HalfEdge>}
 */
Face.prototype.createHalfEdges = function(resultHalfEdgesArray)
{
	if (this.vertexArray === undefined || this.vertexArray.length === 0)
	{ return resultHalfEdgesArray; }
	
	if (resultHalfEdgesArray === undefined)
	{ resultHalfEdgesArray = []; }
	
	var vertex;
	var hedge;
	var verticesCount = this.getVerticesCount();
	
	// 1rst, create the half edges.
	for (var i=0; i<verticesCount; i++)
	{
		vertex = this.getVertex(i);
		hedge = new HalfEdge();
		hedge.setStartVertex(vertex);
		hedge.setFace(this);
		resultHalfEdgesArray.push(hedge);
	}
	
	// now, for all half edges, set the nextHalfEdge.
	var nextHedge;
	var nextIdx;
	for (var i=0; i<verticesCount; i++)
	{
		hedge = resultHalfEdgesArray[i];
		nextIdx = VertexList.getNextIdx(i, this.vertexArray);
		nextHedge = resultHalfEdgesArray[nextIdx];
		hedge.setNext(nextHedge);
	}
	
	// set a hedge for this face.
	this.hEdge = resultHalfEdgesArray[0];
	
	return resultHalfEdgesArray;
};


/**
 * Returns the bbox.
 */
Face.prototype.getBoundingBox = function()
{
	if (this.bbox === undefined)
	{
		var box = new BoundingBox();
		
		for (var i = 0, vertexCount = this.getVerticesCount(); i < vertexCount; i++) 
		{
			var vtx = this.getVertex(i);
			if (i === 0) { box.init(vtx.point3d); }
			else { box.addPoint(vtx.point3d); }
		}
		this.bbox = box;
	}
	
	return this.bbox;
};

/**
 * Returns the bounding sphere.
 */
Face.prototype.getBoundingSphere = function()
{
	var bbox = this.getBoundingBox();
	return bbox.getBoundingSphere();
};