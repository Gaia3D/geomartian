//#version 300 es

#ifdef GL_ES
    precision highp float;
#endif

#define %USE_LOGARITHMIC_DEPTH%
#ifdef USE_LOGARITHMIC_DEPTH
#extension GL_EXT_frag_depth : enable
#endif

#define %USE_MULTI_RENDER_TARGET%
#ifdef USE_MULTI_RENDER_TARGET
#extension GL_EXT_draw_buffers : require
#endif

uniform vec2 u_PlanePos; // Our location in the virtual world displayed by the plane

//in vec3 fs_Pos;
//in vec4 fs_Nor;
//in vec4 fs_Col;

uniform sampler2D hightmap;
uniform sampler2D normap;
uniform sampler2D sceneDepth;
uniform sampler2D colorReflection;
uniform sampler2D sedimap;

//in float fs_Sine;
//in vec2 fs_Uv;
//layout (location = 0) out vec4 out_Col; // This is the final output color that you will see on your
//layout (location = 1) out vec4 col_reflect;
                  // screen for the pixel that is currently being processed.
uniform vec3 u_Eye, u_Ref, u_Up;


uniform int u_TerrainType;
uniform float u_WaterTransparency;
uniform float u_SimRes;
uniform vec2 u_Dimensions;
uniform vec3 unif_LightPos;
uniform float u_far;
uniform float u_near;

varying vec4 vColorAuxTest;
varying float vWaterHeight;
varying float depth;

vec4 packDepth( float v ) {
  vec4 enc = vec4(1.0, 255.0, 65025.0, 16581375.0) * v;
  enc = fract(enc);
  enc -= enc.yzww * vec4(1.0/255.0, 1.0/255.0, 1.0/255.0, 0.0);
  return enc;
}

float unpackDepth(const in vec4 rgba_depth)
{
	return dot(rgba_depth, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));
}

/*
vec3 calnor(vec2 uv){
    float eps = 1.0/u_SimRes;
    vec4 cur = texture(hightmap,uv);
    vec4 r = texture(hightmap,uv+vec2(eps,0.f));
    vec4 t = texture(hightmap,uv+vec2(0.f,eps));

    vec3 n1 = normalize(vec3(-1.0, cur.y + cur.x - r.y - r.x, 0.f));
    vec3 n2 = normalize(vec3(-1.0, t.x + t.y - r.y - r.x, 1.0));

    vec3 nor = -cross(n1,n2);
    nor = normalize(nor);
    return nor;
}

vec3 sky(in vec3 rd){
    return mix(vec3(0.6,0.6,0.6),vec3(0.3,0.5,0.9),clamp(rd.y,0.f,1.f));
}

float linearDepth(float depthSample)
{
    depthSample = 2.0 * depthSample - 1.0;
    float zLinear = 2.0 * u_near * u_far / (u_far + u_near - depthSample * (u_far - u_near));
    return zLinear;
}
*/
void main()
{
    if(vWaterHeight < 0.0001)
    {
        discard;
    }

    float depthAux = depth;

    #ifdef USE_LOGARITHMIC_DEPTH
	//if(bUseLogarithmicDepth)
	{
		gl_FragDepthEXT = log2(flogz) * Fcoef_half;
		depthAux = gl_FragDepthEXT; 
	}
	#endif

    vec4 finalCol4 = vec4(vColorAuxTest);
    
    // save depth, normal, albedo.
    vec4 encodedDepth = packDepth(depthAux); 
	gl_FragData[0] = encodedDepth; 

    //gl_FragData[0] = finalCol4;  // anything.

    #ifdef USE_MULTI_RENDER_TARGET
        gl_FragData[1] = encodedDepth; // depth
        gl_FragData[2] = vec4(1.0); // normal
        gl_FragData[3] = vec4(1.0); // albedo
        gl_FragData[4] = vec4(1.0); // selection color
    #endif
    /*
    vec2 uv = vec2(gl_FragCoord.xy/u_Dimensions);
    float terrainDepth = texture(sceneDepth,uv).x;
    float sediment = texture(sedimap,fs_Uv).x;
    float waterDepth = gl_FragCoord.z;

    terrainDepth = linearDepth(terrainDepth);
    waterDepth = linearDepth(waterDepth);

    float dpVal = 180.0 * max(0.0,terrainDepth - waterDepth);
    dpVal = clamp(dpVal, 0.0,4.0);
    //dpVal = pow(dpVal, 0.1);


    float fbias = 0.2;
    float fscale = 0.2;
    float fpow = 22.0;
    vec3 sundir = unif_LightPos;

    sundir = normalize(sundir);

    vec3 nor = -calnor(fs_Uv);
    vec3 viewdir = normalize(u_Eye - fs_Pos);
    vec3 lightdir = normalize(sundir);
    vec3 halfway = normalize(lightdir + viewdir);
    vec3 reflectedSky = sky(halfway);
    float spec = pow(max(dot(nor, halfway), 0.0), 333.0);


    float R = max(0.0, min(1.0, fbias + fscale * pow(1.0 + dot(viewdir, -nor), fpow)));

    //lamb =1.f;

    float yval = texture(hightmap,fs_Uv).x * 4.0;
    float wval = texture(hightmap,fs_Uv).y;
    wval /= 1.0;



    vec3 watercolor = mix(vec3(0.8,0.0,0.0), vec3(0.0,0.0,0.8), sediment * 2.0);
    vec3 watercolorspec = vec3(1.0);
    watercolorspec *= spec;



    out_Col = vec4(vec3(0.0,0.2,0.5) + R * reflectedSky + watercolorspec  , (.5 + spec) * u_WaterTransparency * dpVal);
    col_reflect = vec4(1.0);
    */
}