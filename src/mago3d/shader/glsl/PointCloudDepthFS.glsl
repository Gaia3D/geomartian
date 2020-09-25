#ifdef GL_ES
precision highp float;
#endif
uniform float near;
uniform float far;

// clipping planes.***
uniform bool bApplyClippingPlanes;
uniform int clippingPlanesCount;
uniform vec4 clippingPlanes[6];

varying float depth;  

vec4 packDepth(const in float depth)
{
    const vec4 bit_shift = vec4(16777216.0, 65536.0, 256.0, 1.0);
    const vec4 bit_mask  = vec4(0.0, 0.00390625, 0.00390625, 0.00390625); 
    vec4 res = fract(depth * bit_shift);
    res -= res.xxyz * bit_mask;
    return res;  
}

vec4 PackDepth32( in float depth )
{
    depth *= (16777216.0 - 1.0) / (16777216.0);
    vec4 encode = fract( depth * vec4(1.0, 256.0, 256.0*256.0, 16777216.0) );// 256.0*256.0*256.0 = 16777216.0
    return vec4( encode.xyz - encode.yzw / 256.0, encode.w ) + 1.0/512.0;
}

void main()
{     
    vec2 pt = gl_PointCoord - vec2(0.5);
	float distSquared = pt.x*pt.x+pt.y*pt.y;
	if(distSquared > 0.25)
		discard;
    gl_FragData[0] = packDepth(-depth);
	//gl_FragData[0] = PackDepth32(depth);
}