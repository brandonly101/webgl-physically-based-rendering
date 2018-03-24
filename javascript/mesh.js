// Copyright Brandon Ly 2015 all rights reserved.

// Small module that handles the creation of meshes and its properties.

"use strict";

// Define a mesh object class.
class Mesh
{
    constructor()
    {
        this.vertices = [];
        this.normals = [];
        this.indices = [];

        this.materialAmbient = [1.0, 1.0, 1.0, 1.0];
        this.materialDiffuse = [1.0, 1.0, 1.0, 1.0];
        this.materialSpecular = [1.0, 1.0, 1.0, 1.0];
    }

    // Create a mesh from a source file.
    static createMesh(src)
    {
        // TODO: Implement an OBJ parser...

    };

    // Create a cube mesh.
    static createCube()
    {
        var result = new Mesh();
        result.vertices = [
            // Front face
            -1.0, -1.0,  1.0,
            1.0, -1.0,  1.0,
            1.0,  1.0,  1.0,
            -1.0,  1.0,  1.0,

            // Back face
            -1.0, -1.0, -1.0,
            -1.0,  1.0, -1.0,
            1.0,  1.0, -1.0,
            1.0, -1.0, -1.0,

            // Top face
            -1.0,  1.0, -1.0,
            -1.0,  1.0,  1.0,
            1.0,  1.0,  1.0,
            1.0,  1.0, -1.0,

            // Bottom face
            -1.0, -1.0, -1.0,
            1.0, -1.0, -1.0,
            1.0, -1.0,  1.0,
            -1.0, -1.0,  1.0,

            // Right face
            1.0, -1.0, -1.0,
            1.0,  1.0, -1.0,
            1.0,  1.0,  1.0,
            1.0, -1.0,  1.0,

            // Left face
            -1.0, -1.0, -1.0,
            -1.0, -1.0,  1.0,
            -1.0,  1.0,  1.0,
            -1.0,  1.0, -1.0
            ];
            result.normals = [
            // Front face
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,

            // Back Face
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,

            // Top Face
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,

            // Bottom face
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,

            // Right face
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,

            // Left face
            -1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0,
            ];
            result.indices = [
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23    // left
            ];
        return result;
    }

    // Create a sphere mesh.
    static createSphere(nDiv)
    {
        var result = new Mesh();
        result.vertices = [];
        result.normals = [];
        result.indices = [];

        var va = [0, 0, -1];
        var vb = [0.0, 0.942809, 0.333333];
        var vc = [-0.816497, -0.471405, 0.333333];
        var vd = [0.816497, -0.471405, 0.333333];

        function tetrahedron(a, b, c, d, n)
        {
            function triangle(a, b, c)
            {
                // Vertices
                result.indices.push(result.vertices.length/3);
                result.vertices = result.vertices.concat(a);
                result.indices.push(result.vertices.length/3);
                result.vertices = result.vertices.concat(b);
                result.indices.push(result.vertices.length/3);
                result.vertices = result.vertices.concat(c);

                // Normals
                result.normals = result.normals.concat(a);
                result.normals = result.normals.concat(b);
                result.normals = result.normals.concat(c);
            }
            function divideTriangle(a, b, c, count)
            {
                if (count > 0)
                {
                    var ab = GLMathLib.normalize(GLMathLib.mid(a, b));
                    var ac = GLMathLib.normalize(GLMathLib.mid(a, c));
                    var bc = GLMathLib.normalize(GLMathLib.mid(b, c));
                    divideTriangle(a, ab, ac, count - 1);
                    divideTriangle(ab, b, bc, count - 1);
                    divideTriangle(bc, c, ac, count - 1);
                    divideTriangle(ab, bc, ac, count - 1);
                } else {
                    triangle (a, b, c);
                }
            }
            divideTriangle(a, b, c, n);
            divideTriangle(d, c, b, n);
            divideTriangle(a, d, b, n);
            divideTriangle(a, c, d, n);
        }

        // Run the function that calls it all.
        tetrahedron(va, vb, vc, vd, nDiv);

        return result;
    }

    // Create a cube map mesh.
    static createCubeMap(length)
    {
        var result = new Mesh();
        result.vertices = [
            // Front face
            -length, -length, -length,
            length, -length, -length,
            length,  length, -length,
            -length,  length, -length,

            // Back face
            -length, -length,  length,
            -length,  length,  length,
            length,  length,  length,
            length, -length,  length,

            // Top face
            -length, -length, -length,
            -length, -length,  length,
            length, -length,  length,
            length, -length, -length,

            // Bottom face
            -length,  length, -length,
            length,  length, -length,
            length,  length,  length,
            -length,  length,  length,

            // Right face
            -length, -length, -length,
            -length,  length, -length,
            -length,  length,  length,
            -length, -length,  length,

            // Left face
            length, -length, -length,
            length, -length,  length,
            length,  length,  length,
            length,  length, -length,
        ];
    // result.texCoords = [
    //     // Front
    //     0.0,  0.0,
    //     1.0,  0.0,
    //     1.0,  1.0,
    //     0.0,  1.0,
    //     // Back
    //     0.0,  0.0,
    //     1.0,  0.0,
    //     1.0,  1.0,
    //     0.0,  1.0,
    //     // Top
    //     0.0,  0.0,
    //     1.0,  0.0,
    //     1.0,  1.0,
    //     0.0,  1.0,
    //     // Bottom
    //     0.0,  0.0,
    //     1.0,  0.0,
    //     1.0,  1.0,
    //     0.0,  1.0,
    //     // Right
    //     0.0,  0.0,
    //     1.0,  0.0,
    //     1.0,  1.0,
    //     0.0,  1.0,
    //     // Right
    //     0.0,  0.0,
    //     1.0,  0.0,
    //     1.0,  1.0,
    //     0.0,  1.0,
    //     // Left
    //     0.0,  0.0,
    //     1.0,  0.0,
    //     1.0,  1.0,
    //     0.0,  1.0
    // ];
        result.texCoords = [
            // Front face
            -length, -length, -length,
            length, -length, -length,
            length,  length, -length,
            -length,  length, -length,

            // Back face
            -length, -length,  length,
            -length,  length,  length,
            length,  length,  length,
            length, -length,  length,

            // Top face
            -length, -length, -length,
            -length, -length,  length,
            length, -length,  length,
            length, -length, -length,

            // Bottom face
            -length,  length, -length,
            length,  length, -length,
            length,  length,  length,
            -length,  length,  length,

            // Right face
            -length, -length, -length,
            -length,  length, -length,
            -length,  length,  length,
            -length, -length,  length,

            // Left face
            length, -length, -length,
            length, -length,  length,
            length,  length,  length,
            length,  length, -length,
            ];
            result.indices = [
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23    // left
        ];

        return result;
    };

    readFile(e)
    {
        var file = e.target.files[0];
        if (!file)
        {
            return;
        }
        var reader = new FileReader();
        reader.onload = function(e)
        {
            var contents = e.target.result;
            displayContents(contents);
        };
        reader.readAsText(file);
    };
}
