#version 300 es

// Copyright 2015 Brandon Ly all rights reserved.
//
// Fragment shader.
//
precision highp float;

const float PI = 3.1415927;
const float ENV_MIP_LEVELS = 10.0;
const float ENV_MIP_MAX = ENV_MIP_LEVELS - 1.0;

// Uniforms
uniform mat4 UMatModel;
uniform mat4 UMatView;
uniform mat4 UMatMV;
uniform mat4 UMatNormal;

uniform samplerCube UTexCubeEnv;
uniform samplerCube UTexCubeIrradiance;
uniform samplerCube UTexCubeSpecIBL;
uniform sampler2D UTextureEnvBRDF;

uniform sampler2D UTextureBaseColor;
uniform sampler2D UTextureNormal;
uniform sampler2D UTextureMetallic;
uniform sampler2D UTextureRoughness;

// Variables passed from vert to pixel
in vec3 VEnvMapI;
in vec3 VEnvMapN;

in vec3 VTextureCoordSkybox;
in vec2 VVertexTexCoord;

in vec3 VTanLightDir;
in vec3 VTanViewDir;

in mat3 VTBN;

out vec4 Color;

// Gamma decode and correct functions
highp vec4 gammaDecode(vec4 encoded) { return pow(encoded, vec4(2.2)); }
highp vec4 gammaCorrect(vec4 linear) { return pow(linear, vec4(1.0 / 2.2)); }

// Physically-based rendering functions

// Schlick's Approximation (of Fresnel Reflectance) (F function).
//
vec3 SchlickApprox(vec3 n, vec3 l, vec3 F0)
{
    return F0 + (1.0 - F0) * pow(1.0 - max(0.0, dot(n, l)), 5.0);
}

// Combined G2 Smith height-correlated masking-shadowing function and
// specular microfacet BRDF denominator (G function) (denom is
// 4 * NdotL * NdotV). Note that the G function is dependent on the
// D function (where GGX is used), and that this function is optimized
// with the use of D GGX in mind.
//
float SmithG2SpecBRDF(vec3 l, vec3 v, vec3 n, float roughness)
{
    float NdotL = abs(dot(n, l));
    float NdotV = abs(dot(n, v));
    float a = roughness * roughness;
    return 0.5 / mix(2.0 * NdotL * NdotV, NdotL + NdotV, a);
}

// GGX (Trowbridge & Reitz) Distribution (D function)
float GGX(vec3 n, vec3 m, float roughness)
{
    float a = roughness * roughness;
    float a2 = a * a;
    float num = (dot(n, m) > 0.0 ? 1.0 : 0.0) * a2;
    float denom = PI * pow(1.0 + pow(dot(n, m), 2.0) * (a2 - 1.0), 2.0);
    return num / denom;
}

// Reflectance Equation - Outgoing Radiance function (Lo)
vec3 RadianceOut(vec3 l, vec3 v, vec3 n, vec3 albedo, float metallic, float roughness)
{
    // Clamp roughness to close to 0 to avoid specular anomolies
    roughness = clamp(roughness, 0.05, 1.0);

    // Microfacet BRDF calculations
    vec3 h = normalize(l + v); // halfway vector
    vec3 F0 = mix(vec3(0.04), albedo, metallic); // specular color
    albedo *= (1.0 - metallic); // the more metallic a material is, the less albedo is factored.
    vec3 F = SchlickApprox(h, l, F0);
    float GDenom = SmithG2SpecBRDF(l, v, n, roughness);
    float D = GGX(n, h, roughness);

    // Specular BRDF
    vec3 BRDFSpecular = F * GDenom * D;

    // Diffuse Lambertian BRDF
    vec3 BRDFDiffuse = albedo / PI * (1.0 - F); // 1 - F is diffuse contribution

    // Grab a world-space vector for environment map lookups.
    vec3 worldN = normalize(VTBN * n);

    // Diffuse irradiance. By multiplying it by the diffuse BRDF (with an included
    // 1 / PI term), we turn it back into radiance.
    vec3 DiffuseIrradiance = texture(UTexCubeIrradiance, worldN).rgb * BRDFDiffuse;

    // Specular Image-based Lighting
    vec3 R = reflect(VEnvMapI, worldN);
    vec3 prefilterColor = textureLod(UTexCubeSpecIBL, R, roughness * ENV_MIP_MAX).rgb;
    vec2 envBRDF = texture(UTextureEnvBRDF, vec2(max(dot(n, v), 0.0), roughness)).rg;
    vec3 SpecularIBL = prefilterColor * (F0 * envBRDF.r + envBRDF.g);

    float NdotL = clamp(dot(n, l), 0.0, 1.0);
    return PI * (BRDFDiffuse + BRDFSpecular) * NdotL + DiffuseIrradiance + SpecularIBL;
}

// Main entry point for pixel shader
void main(void)
{
    vec3 normalMap = texture(UTextureNormal, VVertexTexCoord).rgb; // Normal map
    vec3 TanNormalDir = normalize(normalMap * 2.0 - 1.0); // Shift range of normal map
    vec4 ColorBase = gammaDecode(texture(UTextureBaseColor, VVertexTexCoord)); // Gamma uncorrect
    float Metallic = texture(UTextureMetallic, VVertexTexCoord).r;
    float Roughness = texture(UTextureRoughness, VVertexTexCoord).r;

    vec3 ColorDirLight = vec3(1.0);

    vec3 L = normalize(VTanLightDir);
    vec3 V = normalize(VTanViewDir);
    vec3 N = normalize(TanNormalDir);

    Color = vec4(0.0);
    Color.rgb = RadianceOut(L, V, N, ColorBase.rgb, Metallic, Roughness);
    Color.rgb *= ColorDirLight;

    Color = clamp(Color, 0.0, 1.0); // Clamp to RGB color range

    Color = gammaCorrect(Color); // gamma correct
    Color.a = 1.0;
}
