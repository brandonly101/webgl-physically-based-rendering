// Copyright 2015 Brandon Ly all rights reserved.
//
// Vertex shader.
//

attribute vec3 AVertexPosition;
attribute vec2 AVertexTexCoord;
attribute vec3 AVertexNormal;

uniform vec4 UCamPosition;

uniform vec4 ULightPosition;

uniform mat4 UMatModel;
uniform mat4 UMatView;
uniform mat4 UMatMV;
uniform mat4 UMatProj;
uniform mat4 UMatMVP;
uniform mat4 UMatNormal;

uniform sampler2D UTextureNormal;

varying vec3 EnvMapI;
varying vec3 EnvMapN;
varying vec3 L, N, E;
varying vec3 VTextureCoordSkybox;
varying vec2 VVertexTexCoord;

void main(void)
{
    // Calculate the position and normals to pass into the fragment shader.
    vec3 PosViewSpace = vec3(UMatMV * vec4(AVertexPosition, 1.0));
    vec3 NormViewSpace = vec3(UMatNormal * vec4(AVertexNormal, 1.0));
    vec3 LightViewSpace = (UMatView * ULightPosition).xyz;

    L = normalize(LightViewSpace - PosViewSpace);
    N = normalize(NormViewSpace);
    E = normalize(-PosViewSpace);

    // Calculate environment mapping variables.
    vec3 PosWorldSpace = (UMatModel * vec4(AVertexPosition, 1.0)).xyz;
    EnvMapI = normalize(PosWorldSpace - UCamPosition.xyz);
    EnvMapN = normalize(AVertexNormal);

    VVertexTexCoord = AVertexTexCoord;

    gl_Position = UMatMVP * vec4(AVertexPosition, 1.0);
}
