'use strict';

/**
 * quantized surface
 * @class QuantizedSurface
 * 
 */
var QuantizedSurface = function(qMesh) 
{
    if (!(this instanceof QuantizedSurface)) 
	{
		throw new Error(Messages.CONSTRUCT_ERROR);
	}

    // QuantizedSurface's points domain is positive short size (0 to 32767)

    this.qMesh = qMesh;
    this.vertexList;
    this.trianglesList;

    // auxiliar vars.
    this.newVertexArray = [];
};

QuantizedSurface.prototype._makeQuantizedMeshFromTrianglesList = function (trianglesList, vertexList, resultQMesh)
{
    // this is the reverse function of "_makeTrianglesListFromQuantizedMesh".***
    var vertexCount = vertexList.getVertexCount();
    var uValues = new Uint16Array(vertexCount);
	var vValues = new Uint16Array(vertexCount);
	var hValues = new Uint16Array(vertexCount);

    // provisionally make color4.***
    var color4Array = [];
    var R = 255;
    var G = 50;
    var B = 50;
    var A = 255;

    var RH = 50;
    var GH = 50;
    var BH = 255;
    var AH = 255;

	
    var vertex;
    var pos;
    for(var i=0; i<vertexCount; i++)
    {
        vertex = vertexList.getVertex(i);
        pos = vertex.getPosition();
        uValues[i] = Math.round(pos.x);
        vValues[i] = Math.round(pos.y);
        hValues[i] = Math.round(pos.z);

        // set idx in list of the vertex.
        vertex.idxInList = i;

        /*
        // Test debug:
        // check if any triangle of the vertex is highlighted***
        if(!vertex.trianglesArray)
        {vertex.trianglesArray = [];}
        
        var trianglesOfVertexCount = vertex.trianglesArray.length;
        var triIsHighLighted = false;
        for(var j=0; j<trianglesOfVertexCount; j++)
        {
            if(vertex.trianglesArray[j].getStatus() === CODE.status.HIGHLIGHTED)
            {
                triIsHighLighted = true;
                break;
            }
        }

        if(triIsHighLighted)
        {
            color4Array.push(RH, GH, BH, AH);
        }
        else
        {
            color4Array.push(R, G, B, A);
        }
        */
    }

    // Now, collect all triangles that status is NO DELETED.
    var trianglesArray = [];
    var triCount = trianglesList.getTrianglesCount();
    var triangle;
    for(var i=0; i<triCount; i++)
    {
        triangle = trianglesList.getTriangle(i);
        if(triangle.getStatus() !== CODE.status.DELETED)// && triangle.getStatus() !== CODE.status.HIGHLIGHTED)
        {
            trianglesArray.push(triangle);
        }
    }

    // Now, make indices array.***
    triCount = trianglesArray.length;
    var indices = new Uint16Array(triCount * 3);
    var vtx_1, vtx_2, vtx_3;
    var status;
    for(var i=0; i<triCount; i++)
    {
        triangle = trianglesArray[i]
        vtx_1 = triangle.vertex0;
        vtx_2 = triangle.vertex1;
        vtx_3 = triangle.vertex2;

        indices[i * 3] = vtx_1.idxInList;
        indices[i * 3 + 1] = vtx_2.idxInList;
        indices[i * 3 + 2] = vtx_3.idxInList;

    }

    if(!resultQMesh)
    {
        resultQMesh = {}; // create as an object.***
    }

    resultQMesh._uValues = uValues;
    resultQMesh._vValues = vValues;
    resultQMesh._heightValues = hValues;
    resultQMesh._indices = indices;
    //resultQMesh._colors = new Uint8Array(color4Array);

    return resultQMesh;
};

QuantizedSurface.prototype._makeTrianglesListFromQuantizedMesh = function (resultTrianglesList)
{
    // In this function make a operable triangle-based mesh.
    var qMesh = this.qMesh;
    var minHeight = qMesh._minimumHeight;
	var maxHeight = qMesh._maximumHeight;
	var uValues = qMesh._uValues;
	var vValues = qMesh._vValues;
	var hValues = qMesh._heightValues;
	this.indices = qMesh._indices;

	// 1rst, make points.***
    if(!this.vertexList)
    {
        this.vertexList = new VertexList();
    }

	var pointsCount = uValues.length;
	
	var x, y, z;
    var point3d;
    var vtx;
	for(var i=0; i<pointsCount; i++)
	{
		x = uValues[i];
		y = vValues[i];
		z = hValues[i];

		point3d = new Point3D(x, y, z);
        vtx = this.vertexList.newVertex(point3d);
	}

    // Now, make triangles.***
    if(!resultTrianglesList)
    {
        resultTrianglesList = new TrianglesList();
    }

    var trianglesCount = this.indices.length/3;
    var idxPoint_1, idxPoint_2, idxPoint_3;
    var vtx_1, vtx_2, vtx_3;
    var triangle;

    for(var i=0; i<trianglesCount; i++)
    {
        idxPoint_1 = this.indices[i * 3];
        idxPoint_2 = this.indices[i * 3 + 1];
        idxPoint_3 = this.indices[i * 3 + 2];

        // check for degenerated triangles.***
        if(idxPoint_1 === idxPoint_2 || idxPoint_1 === idxPoint_3 || idxPoint_2 === idxPoint_3)
        {
            continue;
        }

        vtx_1 = this.vertexList.getVertex(idxPoint_1);
        vtx_2 = this.vertexList.getVertex(idxPoint_2);
        vtx_3 = this.vertexList.getVertex(idxPoint_3);

        triangle = resultTrianglesList.newTriangle(vtx_1, vtx_2, vtx_3);

        // Now, for each vertex, make triangles-array that uses these vertices.
        QuantizedSurface._storeTriangleInVertices(triangle);
    }

    return resultTrianglesList;
};

QuantizedSurface.prototype.getTrianglesList = function ()
{
    if(!this.trianglesList)
    {
        this.trianglesList = this._makeTrianglesListFromQuantizedMesh(undefined);
    }

    return this.trianglesList;
};

QuantizedSurface._segment2DIntersectsTriangle2D = function(triangle2d, seg2d) 
{
    // This function calculates if the segment2d intersects with the triangle2d.
    // Remember : In quatizedMesh process, a segment always cuts a triangle by a triangle's vertex.
    //-----------------------------------------------------------------------------------------------------
    // Check if the segment cuts any edge of the triangle.
    var error = QuantizedSurface.getError();
    var intersectPoint = new Point2D();
    var triangleSegment = triangle2d.getSegment2D(0);

    if(triangleSegment.intersectionWithSegment(seg2d, error, intersectPoint))
    {
        // check if the intersectPoint is inside of the triangleSegment.
        var report = triangleSegment.getRelativePositionOfPoint2DReport(intersectPoint, undefined);
        if(report.relPos === CODE.relativePositionPoint2DWithSegment2D.INSIDE)
        {

            var hola = 0;
        }
    }
};



QuantizedSurface.getQuantizedPointsArrayFromGeoCoords = function (geoCoordsArray, geoExtent, resultqPointsArray)
{
    if(!geoCoordsArray || geoCoordsArray.length === 0)
    {
        return resultqPointsArray;
    }

    if(!resultqPointsArray)
    {
        resultqPointsArray = [];
    }

    var geoCoordsCount = geoCoordsArray.length;
    var qPoint;
    for(var i=0; i<geoCoordsCount; i++)
    {
        qPoint = geoExtent.getQuantizedPoint(geoCoordsArray[i], undefined);
        resultqPointsArray.push(qPoint);
    }

    return resultqPointsArray;
};

QuantizedSurface.getTriangleBoundingRect = function (triangle, resultBRect)
{
    // calculate the bRect of a 3d triangle using x,y only.
    if(!resultBRect)
    {
        resultBRect = new BoundingRectangle();
    }

    var point3d = triangle.vertex0.getPosition();
    resultBRect.setInitXY(point3d.x, point3d.y);

    point3d = triangle.vertex1.getPosition();
    resultBRect.addPointXY(point3d.x, point3d.y);

    point3d = triangle.vertex2.getPosition();
    resultBRect.addPointXY(point3d.x, point3d.y);

    return resultBRect;
};

QuantizedSurface.getProjectedTriangle2D_planeXY = function (triangle, resultTriangle2d)
{
    if(!resultTriangle2d)
    {
        resultTriangle2d = new Triangle2D();
    }

    var p0 = triangle.vertex0.getPosition();
    var p1 = triangle.vertex1.getPosition();
    var p2 = triangle.vertex2.getPosition();

    var p2d_0 = new Point2D(p0.x, p0.y);
    var p2d_1 = new Point2D(p1.x, p1.y);
    var p2d_2 = new Point2D(p2.x, p2.y);

    resultTriangle2d.setPoints(p2d_0, p2d_1, p2d_2);

    return resultTriangle2d;
};

QuantizedSurface._storeTriangleInVertices = function (triangle)
{
    var v0 = triangle.vertex0;
    var v1 = triangle.vertex1;
    var v2 = triangle.vertex2;

    if(!v0.trianglesArray)
    { v0.trianglesArray = []; }

    if(!v1.trianglesArray)
    { v1.trianglesArray = []; }

    if(!v2.trianglesArray)
    { v2.trianglesArray = []; }

    v0.trianglesArray.push(triangle);
    v1.trianglesArray.push(triangle);
    v2.trianglesArray.push(triangle);

};

QuantizedSurface._recalculateTrianglesStoredInVertices = function (triList, vertexList)
{
    // Now, reset the triangles stored in each vertex.
    var vertexCount = vertexList.getVertexCount();
    for(var i=0; i<vertexCount; i++)
    {
        var vertex = vertexList.getVertex(i);

        if(vertex.trianglesArray)
        {
            vertex.trianglesArray.length = 0;
        }
    }

    var triCount = triList.getTrianglesCount();
    for(var i=0; i<triCount; i++)
    {
        var triangle = triList.getTriangle(i);
        QuantizedSurface._storeTriangleInVertices(triangle);
    }
};

QuantizedSurface._testDebug_isTriangleNormal_010 = function (triangle)
{
    triangle.calculatePlaneNormal();
    var nx = triangle.normal.x;
    var ny = triangle.normal.y;
    var nz = triangle.normal.z;
    
    var error = 1e-6;
    if(Math.abs(nx) < error && Math.abs(ny)-1.0 < error && Math.abs(nz) < error)
    {
        return true;
    }

    return false;
};

QuantizedSurface._getCoincidentVertexFromVertexArray = function (vertexArray, point3d, error)
{
    // this function is only for inter use.
    if(!error)
    {error = QuantizedSurface.getError(); }
    var vertexCount = vertexArray.length;
    var vertex, vertexCandidate;
    var position;
    for(var i=0; i<vertexCount; i++)
    {
        vertexCandidate = vertexArray[i];
        position = vertexCandidate.getPosition();
        if(position.isCoincidentToPoint(point3d, error))
        {
            vertex = vertexCandidate;
            break;
        }
    }

    return vertex;
};

QuantizedSurface._getOrNewVertex = function (vertexArray, vertexList, point3d)
{
    var error = QuantizedSurface.getError();
    var resultVertex = QuantizedSurface._getCoincidentVertexFromVertexArray(vertexArray, point3d, error);
    if(!resultVertex)
    {
        resultVertex = vertexList.newVertex(point3d);
        vertexArray.push(resultVertex);
    }

    return resultVertex;
};

QuantizedSurface.insertQPointIntoTriangle = function (qPoint, triangle, triList, vertexList, newVertexArray)
{
    // Here, insert the qPoint into triangle and create 3 new triangles, and then delete the original.
    // Create the 3 triangles:
    var tri1, tri2, tri3;
    var v0, v1, v2; // vertices of the original triangle.
    var qPoint3d = new Point3D(qPoint.x, qPoint.y, qPoint.z);

    // 1rst, check if there are a coincident vertex between created vertices in the process.
    //var qVertex = vertexList.newVertex(qPoint3d);
    var qVertex = QuantizedSurface._getOrNewVertex(newVertexArray, vertexList, qPoint3d);

    v0 = triangle.vertex0;
    v1 = triangle.vertex1;
    v2 = triangle.vertex2;

    tri1 = triList.newTriangle(qVertex, v0, v1);
    tri2 = triList.newTriangle(qVertex, v1, v2);
    tri3 = triList.newTriangle(qVertex, v2, v0);

    QuantizedSurface._storeTriangleInVertices(tri1);
    QuantizedSurface._storeTriangleInVertices(tri2);
    QuantizedSurface._storeTriangleInVertices(tri3);

    tri1.setStatus(CODE.status.HIGHLIGHTED);
    tri2.setStatus(CODE.status.HIGHLIGHTED);
    tri3.setStatus(CODE.status.HIGHLIGHTED);

    // now, delete the original triangle.
    triangle.setStatus(CODE.status.DELETED);
};

QuantizedSurface.insertQPointIntoTriangleEdge = function (qPoint, triangle, triList, vertexList, edgeIdx, newVertexArray)
{
    // Here, insert the qPoint into triangle's edge.
    // 1rst, must find the 2 triangles that uses the edge. In frontier triangles, the edge can have only 1 triangle.
    // insert the qPoint into the twinTriangle's edge.***
    // Here, insert the qPoint into triangle edge and create 2 new triangles, and then delete the original.
    var tri1, tri2;
    var v0, v1, v2; // vertices of the original triangle.
    var qPoint3d = new Point3D(qPoint.x, qPoint.y, qPoint.z);
    //var qVertex = vertexList.newVertex(qPoint3d);
    var qVertex = QuantizedSurface._getOrNewVertex(newVertexArray, vertexList, qPoint3d);

    v0 = triangle.vertex0;
    v1 = triangle.vertex1;
    v2 = triangle.vertex2;

    // Now, create 2 new triangles depending the edgeIdx.***
    //var segIdx = triangle.getSegmentIdxOfVertices(vertex_A, vertex_B);

    if(edgeIdx === 0)
    {
        tri1 = triList.newTriangle(qVertex, v1, v2);
        tri2 = triList.newTriangle(qVertex, v2, v0);
    }
    else if(edgeIdx === 1)
    {
        tri1 = triList.newTriangle(qVertex, v2, v0);
        tri2 = triList.newTriangle(qVertex, v0, v1);
    }
    else if(edgeIdx === 2)
    {
        tri1 = triList.newTriangle(qVertex, v0, v1);
        tri2 = triList.newTriangle(qVertex, v1, v2);
    }

    // store triangles into vertices, to use as vertex-triangle-map.
    QuantizedSurface._storeTriangleInVertices(tri1);
    QuantizedSurface._storeTriangleInVertices(tri2);

    tri1.setStatus(CODE.status.HIGHLIGHTED); // delete this.***
    tri2.setStatus(CODE.status.HIGHLIGHTED); // delete this.***

    // finally mark twinTriangle as "deleted".
    triangle.setStatus(CODE.status.DELETED);
    
};

QuantizedSurface.insert2QPointIntoTriangleEdges = function (qPoint_A, qPoint_B, triangle, triList, vertexList, edgeIdx_A, edgeIdx_B, newVertexArray)
{
    // Here, insert the qPoint_A & qPoint_B into triangle's edges.
    // Note : qPoint_A & qPoint_B are in different triangle's edges.***
    var tri1, tri2, tri3;
    var v0, v1, v2; // vertices of the original triangle.
    var qPoint3d_A = new Point3D(qPoint_A.x, qPoint_A.y, qPoint_A.z);
    //var qVertex_A = vertexList.newVertex(qPoint3d_A);
    var qVertex_A = QuantizedSurface._getOrNewVertex(newVertexArray, vertexList, qPoint3d_A);

    var qPoint3d_B = new Point3D(qPoint_B.x, qPoint_B.y, qPoint_B.z);
    //var qVertex_B = vertexList.newVertex(qPoint3d_B);
    var qVertex_B = QuantizedSurface._getOrNewVertex(newVertexArray, vertexList, qPoint3d_B);

    v0 = triangle.vertex0;
    v1 = triangle.vertex1;
    v2 = triangle.vertex2;

    if(edgeIdx_A === 0)
    {
        if(edgeIdx_B === 1)
        {
            //                v2
            //               /  \
            //             /      \
            //           /         * p_B
            //         /             \
            //       /                 \
            //     v0-------*-----------v1
            //             p_A
            tri1 = triList.newTriangle(v0, qVertex_A, v2);
            tri2 = triList.newTriangle(qVertex_A, qVertex_B, v2);
            tri3 = triList.newTriangle(qVertex_A, v1, qVertex_B);
        }
        else if(edgeIdx_B === 2)
        {
            //                v2
            //               /  \
            //             /      \
            //       p_B *          \
            //         /              \
            //       /                  \
            //     v0-------*------------v1
            //             p_A
            tri1 = triList.newTriangle(v0, qVertex_A, qVertex_B);
            tri2 = triList.newTriangle(qVertex_A, v2, qVertex_B);
            tri3 = triList.newTriangle(qVertex_A, v1, v2);
        }
    }
    else if(edgeIdx_A === 1)
    {
        if(edgeIdx_B === 0)
        {
            //                v2
            //               /  \
            //             /      \
            //           /         * p_A
            //         /             \
            //       /                 \
            //     v0-------*-----------v1
            //             p_B
            tri1 = triList.newTriangle(v0, qVertex_B, v2);
            tri2 = triList.newTriangle(qVertex_B, qVertex_A, v2);
            tri3 = triList.newTriangle(qVertex_B, v1, qVertex_A);
        }
        else if(edgeIdx_B === 2)
        {
            //                v2
            //               /  \
            //             /      \
            //       p_B *         * p_A
            //         /             \
            //       /                 \
            //     v0-------------------v1
            //             
            tri1 = triList.newTriangle(v0, v1, qVertex_A);
            tri2 = triList.newTriangle(v0, qVertex_A, qVertex_B);
            tri3 = triList.newTriangle(qVertex_B, qVertex_A, v2);
        }
    }
    else if(edgeIdx_A === 2)
    {
        if(edgeIdx_B === 0)
        {
            //                v2
            //               /  \
            //             /      \
            //       p_A *          \
            //         /              \
            //       /                  \
            //     v0-------*------------v1
            //             p_B
            tri1 = triList.newTriangle(v0, qVertex_B, qVertex_A);
            tri2 = triList.newTriangle(qVertex_B, v2, qVertex_A);
            tri3 = triList.newTriangle(qVertex_B, v1, v2);
        }
        else if(edgeIdx_B === 1)
        {
            //                v2
            //               /  \
            //             /      \
            //       p_A *          * p_B
            //         /              \
            //       /                  \
            //     v0--------------------v1
            //             
            tri1 = triList.newTriangle(v0, v1, qVertex_B);
            tri2 = triList.newTriangle(v0, qVertex_B, qVertex_A);
            tri3 = triList.newTriangle(qVertex_A, qVertex_B, v2);
        }
    }

    QuantizedSurface._storeTriangleInVertices(tri1);
    QuantizedSurface._storeTriangleInVertices(tri2);
    QuantizedSurface._storeTriangleInVertices(tri3);

    // set a flag into triangles marking that the triangle is new.***
    tri1.setStatus(CODE.status.HIGHLIGHTED); // delete this.***
    tri2.setStatus(CODE.status.HIGHLIGHTED); // delete this.***
    tri3.setStatus(CODE.status.HIGHLIGHTED); // delete this.***

    // finally mark twinTriangle as "deleted".
    triangle.setStatus(CODE.status.DELETED);
    
};


QuantizedSurface.insertQPointIntoTrianglesList = function (qPoint, triList, vertexList, newVertexArray)
{
    var triCount = triList.getTrianglesCount();
    var tri, tri2d;
    var point;
    var plane;
    var error = QuantizedSurface.getError();
    var line = new Line();
    line.set2Points(qPoint.x, qPoint.y, 0.0, qPoint.x, qPoint.y, 30000.0);

    var qPoint_insertedIntoEdgesCount = 0;

    for(var i=0; i<triCount; i++)
    {
        tri = triList.getTriangle(i);

        if(tri.getStatus() === CODE.status.DELETED)
        {
            continue;
        }

        if(!tri.bRectXY)
        {
            tri.bRectXY = QuantizedSurface.getTriangleBoundingRect(tri, undefined);
        }

        if(tri.bRectXY.intersectsWithPointXY(qPoint.x, qPoint.y))
        {
            // insert the qPoint into tri and finishes the process.
            // Need the triangle's plane.
            plane = tri.getPlane(plane);

            // Now, find the intersection point.
            var intersectionPoint = plane.intersectionLine(line);

            if(intersectionPoint)
            {
                var intersectionPoint2d = new Point2D(intersectionPoint.x, intersectionPoint.y);
                // Finally, must check if the intersected point is inside of the triangle.
                tri2d = QuantizedSurface.getProjectedTriangle2D_planeXY(tri, tri2d);
                var report = tri2d.getRelativePositionOfPoint2DReport(intersectionPoint2d, undefined, error);

                /*
                CODE.relativePositionPoint2DWithTriangle2D = {
                    "UNKNOWN" : 0,
                    "OUTSIDE" : 1,
                    "INSIDE" : 2,
                    "COINCIDENT_WITH_TRIANGLE_POINT" : 3,
                    "COINCIDENT_WITH_TRIANGLE_EDGE" : 4
                }
                */

                if(report.relPos === CODE.relativePositionPoint2DWithTriangle2D.COINCIDENT_WITH_TRIANGLE_POINT)
                {
                    // Do nothing.***
                    var hola = 0;
                }

                if(report.relPos === CODE.relativePositionPoint2DWithTriangle2D.INSIDE)
                {
                    // Insert the "intersectionPoint" into the triangle -> create 3 triangles & delete the original.
                    QuantizedSurface.insertQPointIntoTriangle(intersectionPoint, tri, triList, vertexList, newVertexArray);
                    // Break process, because there are only ONE triangle that has the qPoint inside.***
                    break;
                }
                else if(report.relPos === CODE.relativePositionPoint2DWithTriangle2D.COINCIDENT_WITH_TRIANGLE_EDGE)
                {
                    // In this case split the triangle.
                    // Must find the 2 triangles of the intersected edge.
                    var edgeIdx = report.segmentIdx;

                    // The triangle must be splitted in 2 triangles.
                    var qPointAux = intersectionPoint;
                    QuantizedSurface.insertQPointIntoTriangleEdge(qPointAux, tri, triList, vertexList, edgeIdx, newVertexArray);
                    // Here do NOT break process because there are 2 possible triangles to put qPoint into edge.***

                    qPoint_insertedIntoEdgesCount += 1;

                    if(qPoint_insertedIntoEdgesCount > 1)
                    {
                        break;
                    }
                }
            }
        }
    }
};

QuantizedSurface.insertQPointsArrayIntoTrianglesList = function (qPointsArray, triList, vertexList, newVertexArray)
{
    // Note: the triangles of the triList has as points quantizedPoints.
    var qPointsCount = qPointsArray.length;
    for(var i=0; i<qPointsCount; i++)
    {
        QuantizedSurface.insertQPointIntoTrianglesList(qPointsArray[i], triList, vertexList, newVertexArray);
    }
};

QuantizedSurface.getError = function ()
{
    //return 1e-8;
    return 1e-3;
    //return 1; // no works correctly.
}

QuantizedSurface._cutTrianglesWithPlane = function (triList, plane, segment2d, vertexList, resultTrianglesArray, newVertexArray) 
{
    // This is a special function in the "QuantizedSurface".
    //*********************************************************************************************************************************************
    // The qMesh was prepared inserting vertices & refining the mesh, so all segments points are coincidents with triangles vertices.***
    //*********************************************************************************************************************************************
    var triCount = triList.getTrianglesCount();
    var tri;
    var report;
    var error = QuantizedSurface.getError();
    for(var i=0; i<triCount; i++)
    {
        tri = triList.getTriangle(i);
        if(tri.getStatus() === CODE.status.DELETED)
        {
            continue;
        }

        report = tri.getIntersectionByPlaneReport(plane, undefined, error);

        // Note : if the report.length === 1, then the triangle is tangent to plane by one vertex.***

        if(report && report.length > 1)
        {
            // Now, split the triangle if the intersected points is inside of the range of the segment2d.***
            // The triangle can be splitted in 2 or 3 triangles.
            // If the plane intersects any triangle's vertex, then the triangle is splitted in 2 triangles.
            // If the plane intersects the triangle in the triangles edges, then the triangle is splitted in 3 triangles.
            var intersect_1 = report[0];
            var intersect_2 = report[1];

            // 1rst, check if the intersected points are inside of the range.
            var intersectPoint_1 = intersect_1.intesectPoint;
            var intersectPoint_2 = intersect_2.intesectPoint;

            // check if intersectPoint_1 && intersectPoint_2 intersects in 2d with segment2d.
            // There are 2 cases:
            // 1) the 2 points intersects the segment2d.
            // 2) Only 1 point intersects the segment2d.
            // If only 1 point intersects and the intersection is in a edge, then, split the triangle by triangles-edge to triangles-oppositeVertex.
            var intersectPoint2d_1 = new Point2D(intersectPoint_1.x, intersectPoint_1.y);
            var intersectPoint2d_2 = new Point2D(intersectPoint_2.x, intersectPoint_2.y);

            /*
            CODE.relativePositionPoint2DWithSegment2D = {
                "UNKNOWN" : 0,
                "OUTSIDE" : 1,
                "INSIDE" : 2,
                "COINCIDENT_WITH_START_POINT" : 3,
                "COINCIDENT_WITH_END_POINT" : 4
            }
            */
            var relPosPoint2d_1 = segment2d.getRelativePositionOfPoint2DReport(intersectPoint2d_1, undefined, error);
            var relPosPoint2d_2 = segment2d.getRelativePositionOfPoint2DReport(intersectPoint2d_2, undefined, error);

            // Here must check if one of the points2d is inside & the another point is outside.***
            if (relPosPoint2d_1.relPos === CODE.relativePositionPoint2DWithSegment2D.OUTSIDE || relPosPoint2d_2.relPos === CODE.relativePositionPoint2DWithSegment2D.OUTSIDE)
            {
                continue;
            }

            if(intersect_1.intersectionType === "segmentIntersection")
            {
                if(intersect_2.intersectionType === "segmentIntersection")
                {
                    // The triangle must be splitted in 3 triangles.
                    var qPoint_A = intersect_1.intesectPoint;
                    var qPoint_B = intersect_2.intesectPoint;
                    var edgeIdx_A = intersect_1.idx;
                    var edgeIdx_B = intersect_2.idx;
                    QuantizedSurface.insert2QPointIntoTriangleEdges(qPoint_A, qPoint_B, tri, triList, vertexList, edgeIdx_A, edgeIdx_B, newVertexArray);

                }
                else if(intersect_2.intersectionType === "startPointIntersection")
                {
                    // The triangle must be splitted in 2 triangles.
                    var qPoint = intersect_1.intesectPoint;
                    var edgeIdx = intersect_1.idx;
                    QuantizedSurface.insertQPointIntoTriangleEdge(qPoint, tri, triList, vertexList, edgeIdx, newVertexArray);
                }
            }
            else if(intersect_1.intersectionType === "startPointIntersection")
            {
                if(intersect_2.intersectionType === "segmentIntersection")
                {
                    // The triangle must be splitted in 2 triangles.
                    var qPoint = intersect_2.intesectPoint;
                    var edgeIdx = intersect_2.idx;
                    QuantizedSurface.insertQPointIntoTriangleEdge(qPoint, tri, triList, vertexList, edgeIdx, newVertexArray);
                }
                else if(intersect_2.intersectionType === "startPointIntersection")
                {
                    // This is a tangent case. Do not splitt the triangle.
                    var hola = 0;
                }
            }
        }
        var hola = 0;
        //triCount = triList.getTrianglesCount();
    }
    
};

QuantizedSurface._getPolygon2D_fromQuantizedPoints = function (qPointsArray, resultPolygon2d)
{
    // Note : quantizedPoints are Point3D class object.***
    if(!resultPolygon2d)
    {
        resultPolygon2d = new Polygon2D();
    }

    if(!resultPolygon2d.point2dList)
    {
        resultPolygon2d.point2dList = new Point2DList(); 
    }

    var pointsCount = qPointsArray.length;
    var qPoint;
    var point2d;
    for(var i=0; i<pointsCount; i++)
    {
        qPoint = qPointsArray[i];
        point2d = resultPolygon2d.point2dList.newPoint(qPoint.x, qPoint.y);
    }

    return resultPolygon2d;
};

QuantizedSurface._isPoint2dInsideOfPolygon = function (point2d, convexPolygonsArray)
{
    var convexPolygons2dCount = convexPolygonsArray.length;
    var convexPoly;
    for(var i=0; i<convexPolygons2dCount; i++)
    {
        convexPoly = convexPolygonsArray[i];

        // 0 : no intersection 1 : pointCoincident, 2 : edgeCoincident. 3 : interior
        var relPos = convexPoly.getRelativePostionOfPoint2DConvexPolygon(point2d);

        if(relPos !== 0)
        {
            return true;
        }
    }

    return false;
};

QuantizedSurface._classifyTrianglesAsInteriorOrExteriorOfPolygon = function (triList, convexPolygonsArray)
{
    // for each triangle, mark the triangle that is interior of the polygon2d.***
    var triCount = triList.getTrianglesCount();
    var tri;
    var centerPoint;
    var centerPoint2d = new Point2D();
    //var report;
    var error = QuantizedSurface.getError();
    for(var i=0; i<triCount; i++)
    {
        tri = triList.getTriangle(i);

        if(tri.getStatus() === CODE.status.DELETED)
        {
            continue;
        }

        // take the baricenter of the triangle.***
        centerPoint = tri.getCenterPoint(centerPoint);
        centerPoint2d.set(centerPoint.x, centerPoint.y);

        // chack if the centerPoint is inside of the polygon2d.***
        if(QuantizedSurface._isPoint2dInsideOfPolygon(centerPoint2d, convexPolygonsArray))
        {
            tri.setStatus(CODE.status.HIGHLIGHTED);
        }
        else
        {
            tri.setStatus(CODE.status.NORMAL);
        }
    }
};

QuantizedSurface._getAdjacentTriangles = function (triangle, resultAdjacentTrianglesArray)
{
    // This function find the adjacentTriangles of the triangle.
    // A triangle must have 3 adjacentTriangles, one for each edge, as max.***

    var v0 = triangle.vertex0;
    var v1 = triangle.vertex1;
    var v2 = triangle.vertex2;

    // edge 0.***
    // between the triangles of v0, find a triangle that has v0 & v1 & is different of "triangle".***
    var v0_trianglesArray = v0.trianglesArray;
    var triCount = v0_trianglesArray.length;
    var triCandidate;
    var twinTriangle_edge_0;
    for(var i=0; i<triCount; i++)
    {
        triCandidate = v0_trianglesArray[i];
        if(triCandidate.getStatus() === CODE.status.DELETED)
        {
            continue;
        }

        // check if has v0 & v1.***
        if(triCandidate !== triangle && triCandidate.hasVertex(v0) && triCandidate.hasVertex(v1))
        {
            // this is the twinTriangle for edge_0 of triangle.***
            twinTriangle_edge_0 = triCandidate;
            break;
        }
    }

    // edge 1.***
    // between the triangles of v0, find a triangle that has v0 & v1 & is different of "triangle".***
    var v1_trianglesArray = v1.trianglesArray;
    var triCount = v1_trianglesArray.length;
    var triCandidate;
    var twinTriangle_edge_1;
    for(var i=0; i<triCount; i++)
    {
        triCandidate = v1_trianglesArray[i];
        if(triCandidate.getStatus() === CODE.status.DELETED)
        {
            continue;
        }

        // check if has v0 & v1.***
        if(triCandidate !== triangle && triCandidate.hasVertex(v1) && triCandidate.hasVertex(v2))
        {
            // this is the twinTriangle for edge_0 of triangle.***
            twinTriangle_edge_1 = triCandidate;
            break;
        }
    }

    // edge 2.***
    // between the triangles of v0, find a triangle that has v0 & v1 & is different of "triangle".***
    var v2_trianglesArray = v2.trianglesArray;
    var triCount = v2_trianglesArray.length;
    var triCandidate;
    var twinTriangle_edge_2;
    for(var i=0; i<triCount; i++)
    {
        triCandidate = v2_trianglesArray[i];
        if(triCandidate.getStatus() === CODE.status.DELETED)
        {
            continue;
        }

        // check if has v0 & v1.***
        if(triCandidate !== triangle && triCandidate.hasVertex(v2) && triCandidate.hasVertex(v0))
        {
            // this is the twinTriangle for edge_0 of triangle.***
            twinTriangle_edge_2 = triCandidate;
            break;
        }
    }

    if(!resultAdjacentTrianglesArray)
    {
        resultAdjacentTrianglesArray = new Array(3);
    }

    resultAdjacentTrianglesArray[0] = twinTriangle_edge_0;
    resultAdjacentTrianglesArray[1] = twinTriangle_edge_1;
    resultAdjacentTrianglesArray[2] = twinTriangle_edge_2;
    
    return resultAdjacentTrianglesArray;
};

QuantizedSurface._swapTriangleVertex = function (triangle, originalVertex, newVertex)
{
    if(triangle.vertex0 === originalVertex)
    {
        triangle.vertex0 = newVertex;
        return 0;
    }
    else if(triangle.vertex1 === originalVertex)
    {
        triangle.vertex1 = newVertex;
        return 1;
    }
    else if(triangle.vertex2 === originalVertex)
    {
        triangle.vertex2 = newVertex;
        return 2;
    }

    return -1;
};

QuantizedSurface._unweldTriangles = function (triangle_A, edge_A_idx, triangle_B, triList, vertexList)
{
    // Given 2 triangles, welded in edge_A, & the edge_A_idx, this function unwelds the triangles creating new 2 vertices.
    var weldedVtx_1, weldedVtx_2;
    if(edge_A_idx === 0)
    {
        weldedVtx_1 = triangle_A.vertex0;
        weldedVtx_2 = triangle_A.vertex1;
    }
    else if(edge_A_idx === 1)
    {
        weldedVtx_1 = triangle_A.vertex1;
        weldedVtx_2 = triangle_A.vertex2;
    }
    else if(edge_A_idx === 2)
    {
        weldedVtx_1 = triangle_A.vertex2;
        weldedVtx_2 = triangle_A.vertex0;
    }

    // Create 2 new vertex in the same position oh vtx_0 & vtx_1.***
    var pos_1 = weldedVtx_1.getPosition();
    var newVertex_1 = vertexList.newVertex(new Point3D(pos_1.x, pos_1.y, pos_1.z));
    
    var pos_2 = weldedVtx_2.getPosition();
    var newVertex_2 = vertexList.newVertex(new Point3D(pos_2.x, pos_2.y, pos_2.z));
    
    // now, swap the vertex for NORMAL triangle.
    var vtxIdxA = QuantizedSurface._swapTriangleVertex(triangle_B, weldedVtx_1, newVertex_1);
    var vtxIdxB = QuantizedSurface._swapTriangleVertex(triangle_B, weldedVtx_2, newVertex_2);

    // Now, must unweld all triangle welded by vertex.***


};

QuantizedSurface._createLateralTrianglesOfTriangle = function (tri, triList)
{
    // The triangle must be NORMAL type.
    var vertexA, vertexB;
    var twinVertexA = undefined; // int.***
    var twinVertexB = undefined; // int.***

    // check if has 2 vertex with twinVertex.
    if(tri.vertex0.twinVertex)
    {
        if(tri.vertex1.twinVertex)
        {
            vertexA = tri.vertex0;
            twinVertexA = tri.vertex0.twinVertex;

            vertexB = tri.vertex1;
            twinVertexB = tri.vertex1.twinVertex;
        }
        else if(tri.vertex2.twinVertex)
        {
            vertexA = tri.vertex2;
            twinVertexA = tri.vertex2.twinVertex;

            vertexB = tri.vertex0;
            twinVertexB = tri.vertex0.twinVertex;
        }
    }
    else if(tri.vertex1.twinVertex)
    {
        vertexA = tri.vertex1;
        twinVertexA = tri.vertex1.twinVertex;

        if(tri.vertex2.twinVertex)
        {
            vertexB = tri.vertex2;
            twinVertexB = tri.vertex2.twinVertex;
        }
    }

    if(twinVertexA && twinVertexB)
    {
        // create 2 triangles.***
        var tri1, tri2;
        tri1 = triList.newTriangle(twinVertexA, twinVertexB, vertexB);
        tri2 = triList.newTriangle(twinVertexA, vertexB, vertexA);
        return true;
    }
    

    return false;
};

QuantizedSurface.recalculateSkirtIndices = function (triList, vertexList, excavationDepth)
{
    //
};

QuantizedSurface.createLateralTrianglesOfExcavation = function (triList, vertexList, excavationDepth)
{
    // Now, reset the triangles stored in each vertex.
    QuantizedSurface._recalculateTrianglesStoredInVertices(triList, vertexList);

    // 1rst, unweld triangles NORMALs & HIGHLIGHTEDs.***
    var vertexCount = vertexList.getVertexCount();
    for(var i=0; i<vertexCount; i++)
    {
        var vertex = vertexList.getVertex(i);
        var vtxTrianglesArray = vertex.trianglesArray;
        if(!vtxTrianglesArray)
        { continue; }

        // 1rst, separated triangles by status.***
        var highlightedTrianglesArray = [];
        var normalTrianglesArray = [];
        var vertexTriCount = vtxTrianglesArray.length;
        for(var j=0; j<vertexTriCount; j++)
        {
            var vertexTri = vtxTrianglesArray[j];
            var vtxTriStatus = vertexTri.getStatus();
            if(vtxTriStatus === CODE.status.NORMAL)
            {
                normalTrianglesArray.push(vertexTri);
            }
            else if(vtxTriStatus === CODE.status.HIGHLIGHTED)
            {
                highlightedTrianglesArray.push(vertexTri);
            }
        }

        // Now, create a new vertex for NORMAL triangles if exists.***
        var normalTriCount = normalTrianglesArray.length;
        var highlightedTriCount = highlightedTrianglesArray.length;

        if(normalTriCount > 0 && highlightedTriCount > 0)
        {
            // create a new vertex for NORMAL triangles.***
            var pos = vertex.getPosition();
            var newVertex = vertexList.newVertex(new Point3D(pos.x, pos.y, pos.z));

            // store in newVertex the originalVertex as twinVertex.
            newVertex.twinVertex = vertex;

            for(var j=0; j<normalTriCount; j++)
            {
                var normalTri = normalTrianglesArray[j];
                QuantizedSurface._swapTriangleVertex(normalTri, vertex, newVertex);

            }
        }
    }

    QuantizedSurface._recalculateTrianglesStoredInVertices(triList, vertexList);

    // Create lateral triangles.***
    var triCount = triList.getTrianglesCount();
    var tri;
    var status;
    var pos;
    var twinVertex1, twinVertex2;

    for(var i=0; i<triCount; i++)
    {
        tri = triList.getTriangle(i);
        status = tri.getStatus();

        if(status === CODE.status.NORMAL)
        {
            QuantizedSurface._createLateralTrianglesOfTriangle(tri, triList);
        }
    }

    // set all highlighted triangles as zero altitude.***
    var triCount = triList.getTrianglesCount();
    var tri;
    var status;
    var pos;

    for(var i=0; i<triCount; i++)
    {
        tri = triList.getTriangle(i);
        status = tri.getStatus();
        if(status === CODE.status.HIGHLIGHTED)
        {
            // set excavation altitude.***
            pos = tri.vertex0.getPosition();
            pos.z = 0.0;
            pos = tri.vertex1.getPosition();
            pos.z = 0.0;
            pos = tri.vertex2.getPosition();
            pos.z = 0.0;
        }
    }

    
    var hola = 0;
};

QuantizedSurface.prototype.excavation = function (excavationGeoCoords, excavationDepth)
{
    // In this function, cut the qmesh with the excavationPolygon and create a negative extrude.
    var triList = this.getTrianglesList();

    // make vertexSegment in positive short range by geographicCoords.
    if(!this.qMesh.geoExtent)
    {
        // Make the geographicExtent by tile indices L, X, Y.
        var imageryType = CODE.imageryType.CRS84;
        var tileIndices = this.qMesh.tileIndices;
        this.qMesh.geoExtent = SmartTile.getGeographicExtentOfTileLXY(tileIndices.L, tileIndices.X, tileIndices.Y, undefined, imageryType);

        // set minAltitude & maxAltitude to the geoExtent.
        var maxHeight = this.qMesh._maximumHeight;
        var minHeight = this.qMesh._minimumHeight;
        
        this.qMesh.geoExtent.setExtentAltitudes(minHeight, maxHeight);
    }

    // 1rst, remake the qMesh inserting all geoCoords inside of triangles of the qMesh, and then the qMesh is refined.
    var geoExtent = this.qMesh.geoExtent;
    var qPointsArray = QuantizedSurface.getQuantizedPointsArrayFromGeoCoords(excavationGeoCoords, geoExtent, undefined);
    QuantizedSurface.insertQPointsArrayIntoTrianglesList(qPointsArray, triList, this.vertexList, this.newVertexArray);
    
    // Now, make segments2d of the cutting polygon.
    var geoCoordsCount = qPointsArray.length;
    var nextIdx;
    var segment2d = new Segment2D();
    var qPoint1, qPoint2, qPointHight; // Point3D class.
    qPointHight = new Point3D();
    var plane = new Plane();
    for(var i=0; i<geoCoordsCount; i++)
    {
        nextIdx = GeometryUtils.getNextIdx(i, geoCoordsCount);
        qPoint1 = qPointsArray[i];
        qPoint2 = qPointsArray[nextIdx];

        qPointHight.set(qPoint1.x, qPoint1.y, qPoint1.z + 10000.0);
        segment2d.setPoints(new Point2D(qPoint1.x, qPoint1.y), new Point2D(qPoint2.x, qPoint2.y));

        // Now, make a vertical plane with qPoint1, qPoint2 and qPointHight.
        plane.set3Points(qPoint1.x, qPoint1.y, qPoint1.z,   qPoint2.x, qPoint2.y, qPoint2.z,   qPointHight.x, qPointHight.y, qPointHight.z);

        QuantizedSurface._cutTrianglesWithPlane(triList, plane, segment2d, this.vertexList, undefined, this.newVertexArray);
    }

    // Now, must classify the triangles that are inside of the excavationGeoCoords.***
    // 1rst, make a polygon2d from excavationGeoCoords.
    // 2nd, calculate normal to obtain concaveVerticesIndices of the polygon2d.
    // Extract convex polygons2d.
    var polygon2d = QuantizedSurface._getPolygon2D_fromQuantizedPoints(qPointsArray, undefined);
    var concavePointsIdxArray = polygon2d.calculateNormal();
    var convexPolygonsArray = polygon2d.tessellate(concavePointsIdxArray, undefined);
    
    // Now, for each triangle, check if it is inside of the polygon2d.
    QuantizedSurface._classifyTrianglesAsInteriorOrExteriorOfPolygon(triList, convexPolygonsArray);

    // Now, for interior triangles set z -= excavationHeight, and create excavation lateral triabgles.***
    QuantizedSurface.createLateralTrianglesOfExcavation(triList, this.vertexList, excavationDepth);

    // Now, must recalculate the skirt indices.***


    // Now, remake the quantized mesh.***
    this._makeQuantizedMeshFromTrianglesList(triList, this.vertexList, this.qMesh);
    
    var hola = 0;
};