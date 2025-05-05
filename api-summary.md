# API Summary: Image Generation and Understanding

This document summarizes the image generation and image understanding capabilities of the Puter and Gemini APIs, based on the provided documentation.

## Puter API

Puter.js allows access to OpenAI API capabilities without needing an OpenAI API key.

### Image Generation

To generate images using DALL-E 3, use the `puter.ai.txt2img()` function:

```javascript
puter.ai.txt2img("A futuristic cityscape at night")
    .then(imageElement => {
        document.body.appendChild(imageElement);
    });
```

### Image Analysis

To analyze images using GPT-4o Vision, provide an image URL to `puter.ai.chat()`:

```javascript
puter.ai.chat(
    "What do you see in this image?",
    "https://assets.puter.site/doge.jpeg"
)
.then(response => {
    puter.print(response);
});
```

### Specifying OpenAI Models

You can specify different OpenAI models using the `model` parameter with `puter.ai.chat()`, such as `gpt-4.1`, `o3-mini`, `o1-mini`, or `gpt-4o`:

```javascript
puter.ai.chat(
    "Write a short poem about coding",
    { model: "gpt-4.1" }
).then(response => {
    puter.print(response);
});
```

Supported models include:

```
gpt-4.1
gpt-4.1-mini
gpt-4.1-nano
gpt-4.5-preview
gpt-4o
gpt-4o-mini
o1
o1-mini
o1-pro
o3
o3-mini
o4-mini
```

### Streaming Responses

For longer responses, use streaming to get results in real-time:

```javascript
async function streamResponse() {
    const response = await puter.ai.chat(
        "Explain the theory of relativity in detail",
        {stream: true}
    );

    for await (const part of response) {
        puter.print(part?.text);
    }
}

streamResponse();
```

## Gemini API

The Gemini API supports image generation using Gemini 2.0 Flash Experimental and Imagen 3.

### Image Generation with Gemini 2.0 Flash Experimental

Gemini 2.0 Flash Experimental supports outputting text and inline images, allowing for conversational image editing and generating outputs with interwoven text. All generated images include a SynthID watermark.

Example:

```python
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO
import base64

client = genai.Client()

contents = ('Hi, can you create a 3d rendered image of a pig '
            'with wings and a top hat flying over a happy '
            'futuristic scifi city with lots of greenery?')

response = client.models.generate_content(
    model="gemini-2.0-flash-exp-image-generation",
    contents=contents,
    config=types.GenerateContentConfig(
      response_modalities=['TEXT', 'IMAGE']
    )
)

for part in response.candidates[0].content.parts:
  if part.text is not None:
    print(part.text)
  elif part.inline_data is not None:
    image = Image.open(BytesIO((part.inline_data.data)))
    image.save('gemini-native-image.png')
    image.show()
```

### Image Editing with Gemini 2.0 Flash Experimental

To perform image editing, add an image as input. The following example demonstrates uploading base64 encoded images.

Example:

```python
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO

import PIL.Image

image = PIL.Image.open('/path/to/image.png')

client = genai.Client()

text_input = ('Hi, This is a picture of me.'
            'Can you add a llama next to me?',)

response = client.models.generate_content(
    model="gemini-2.0-flash-exp-image-generation",
    contents=[text_input, image],
    config=types.GenerateContentConfig(
      response_modalities=['TEXT', 'IMAGE']
    )
)

for part in response.candidates[0].content.parts:
  if part.text is not None:
    print(part.text)
  elif part.inline_data is not None:
    image = Image.open(BytesIO(part.inline_data.data))
    image.show()
```

### Image Generation with Imagen 3

Imagen 3 excels at photorealism, artistic detail, and specific artistic styles.

Example:

```python
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO

client = genai.Client(api_key='GEMINI_API_KEY')

response = client.models.generate_images(
    model='imagen-3.0-generate-002',
    prompt='Robot holding a red skateboard',
    config=types.GenerateImagesConfig(
        number_of_images= 4,
    )
)
for generated_image in response.generated_images:
  image = Image.open(BytesIO(generated_image.image.image_bytes))
  image.show()
```

#### Imagen Model Parameters

*   `numberOfImages`: The number of images to generate, from 1 to 4 (inclusive). The default is 4.
*   `aspectRatio`: Changes the aspect ratio of the generated image. Supported values are `"1:1"`, `"3:4"`, `"4:3"`, `"9:16"`, and `"16:9"`. The default is `"1:1"`.
*   `personGeneration`: Allow the model to generate images of people. Supported values: `"DONT_ALLOW"`, `"ALLOW_ADULT"` (default).

### Gemini API: Image Understanding

Gemini models can process images for various tasks.

#### Image Input

Images can be provided in the following ways:

*   **Upload an image file:** Using the Files API for files larger than 20MB or when reusing the file.
*   **Pass inline image data:** With the request to `generateContent` for smaller files (<20MB total request size) or images fetched directly from URLs. Image data can be Base64 encoded strings or by reading local files directly.

#### Prompting with Multiple Images

Multiple images can be provided in a single prompt by including multiple image `Part` objects in the `contents` array.

Example:

```python
from google import genai
from google.genai import types

client = genai.Client(api_key="GOOGLE_API_KEY")

# Upload the first image
image1_path = "path/to/image1.jpg"
uploaded_file = client.files.upload(file=image1_path)

# Prepare the second image as inline data
image2_path = "path/to/image2.png"
with open(image2_path, 'rb') as f:
    img2_bytes = f.read()

# Create the prompt with text and multiple images
response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents=[
        "What is different between these two images?",
        uploaded_file,  # Use the uploaded file reference
        types.Part.from_bytes(
            data=img2_bytes,
            mime_type='image/png'
        )
    ]
)

print(response.text)
```

#### Getting Bounding Boxes

Gemini models can identify objects in an image and provide their bounding box coordinates, returned relative to the image dimensions, scaled to \[0, 1000].

Prompt:

```
Detect the all of the prominent items in the image. The box_2d should be [ymin, xmin, ymax, xmax] normalized to 0-1000.
```

#### Image Segmentation

Gemini models can segment objects and provide a mask of their contours. The model predicts a JSON list, where each item represents a segmentation mask. Each item has a bounding box (" `box_2d`"), a label (" `label`"), and the segmentation mask inside the bounding box, as base64 encoded png.

Prompt:

```
Give the segmentation masks for the wooden and glass items.
Output a JSON list of segmentation masks where each entry contains the 2D
bounding box in the key "box_2d", the segmentation mask in key "mask", and
the text label in the key "label". Use descriptive labels.
```

#### Supported Image Formats

*   PNG - `image/png`
*   JPEG - `image/jpeg`
*   WEBP - `image/webp`
*   HEIC - `image/heic`
*   HEIF - `image/heif`