// Copyright 2015-2019 Brandon Ly all rights reserved.
//
// Irradiance fragment shader.
//
// Use Monte Carlo Integration over hemisphere of a normal to capture incoming radiance
// from environment map. Use Hammersley point set to generate points on a hemisphere
// (http://holger.dammertz.org/stuff/notes_HammersleyOnHemisphere.html).
// Non-bitwise operation variant of Van Der Corpus found here
// (https://learnopengl.com/PBR/IBL/Specular-IBL).
//
// Special thanks to MJP for thorough irradiance map calculation explanation
// (https://www.gamedev.net/forums/topic/691168-calculating-irradiance-map/).
//
precision highp float;

uniform samplerCube UTexCubeEnv;

varying vec3 VTextureCoordSkybox;

// Gamma decode and correct functions
highp vec4 gammaDecode(vec4 encoded) { return pow(encoded, vec4(2.2)); }
highp vec4 gammaCorrect(vec4 linear) { return pow(linear, vec4(1.0 / 2.2)); }

// Constants
const float PI = 3.1415927;

const int NUM_SAMPLES = 1024;

float VanDerCorpus(int n, int base)
{
    float invBase = 1.0 / float(base);
    float denom   = 1.0;
    float result  = 0.0;

    for (int i = 0; i < 32; i++)
    {
        if (n > 0)
        {
            denom   = mod(float(n), 2.0);
            result += denom * invBase;
            invBase = invBase / 2.0;
            n       = int(float(n) / 2.0);
        }
    }

    return result;
}

vec2 Hammersley(int i, int N)
{
    return vec2(float(i) / float(N), VanDerCorpus(i, 2));
}

void main(void)
{
    // Use uniformly-distributed points on hemisphere centered around normal.
    vec4 irradiance = vec4(0.0);

    // Create a TBN matrix. Tangent space is where Z+ is up.
    vec3 Up =  vec3(0.0, 0.0, 1.0); // Z is Up vector
    vec3 N = normalize(VTextureCoordSkybox);
    vec3 T = normalize(cross(Up, N));
    vec3 B = cross(N, T);
    mat3 TBN = mat3(T, B, N);

    for (int i = 0; i < NUM_SAMPLES; i++)
    {
        // Create uniformly-distributed vector on hemisphere. Spherical coordinates follow
        // physics conventions. Integrate over theta range of [0, 2 * PI] and phi range of
        // [0, PI / 2] (i.e. a hemisphere).

        // Hammersley point sample
        vec2 Xi = Hammersley(i, NUM_SAMPLES);
        float cosTheta = (1.0 - Xi.x); // uniform distribution variant
        float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
        float phi = 2.0 * PI * Xi.y;

        float x = sinTheta * cos(phi);
        float y = sinTheta * sin(phi);
        float z = cosTheta;
        vec3 tanHemiVector = vec3(x, y, z);

        // Transform vector into world space.
        vec3 worldHemiVector = normalize(TBN * tanHemiVector);

        // Sample raw environment map.
        vec4 radiance = gammaDecode(textureCube(UTexCubeEnv, worldHemiVector));
        irradiance += radiance * clamp(dot(worldHemiVector, N), 0.0, 1.0);
    }

    // For uniform sampling the probability distribution function (PDF) is constant for all samples;
    // there is equal chance of any solid angle on the hemisphere being chosen. As such, the
    // hemisphere PDF is 1 / surface area (i.e. 1 / 2PI).
    float hemispherePDF = 1.0 / (2.0 * PI);
    irradiance /= (float(NUM_SAMPLES) * hemispherePDF);
    irradiance.a = 1.0;

    gl_FragColor = irradiance; // Output irradiance map in linear color space.
}
