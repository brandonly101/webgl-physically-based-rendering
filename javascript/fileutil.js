// Copyright Brandon Ly 2015-2018 all rights reserved.
//
// File reading utility class with static functions
//

class FileUtil
{
    // Get a specified filename (w/ path) as a Blob
    static GetFile(filename)
    {
        var result = null;

        var stall = true;

        var req = new XMLHttpRequest();
        req.open('GET', filename, false);
        req.send(null);
        if (req.status === 200)
        {
            result = req.response;
        }
        return result;
    }

    static GetFileShader(filename)
    {
        var result = "";
        var blobShader = FileUtil.GetFile(filename);

        if (blobShader)
        {
            var reader = new FileReader();
            var textShader = reader.readAsText(blobShader);
            if (textShader != "")
            {
                result = textShader;
            }
        }

        return result;
    }
}
