'use server';
/**
 * @fileOverview This file contains a Genkit flow for automatically identifying highlight images from a gallery.
 *
 * - photographerAIGalleryHighlights - A function that analyzes uploaded photo galleries and suggests visually impactful images for a highlight reel.
 * - PhotographerAIGalleryHighlightsInput - The input type for the photographerAIGalleryHighlights function.
 * - PhotographerAIGalleryHighlightsOutput - The return type for the photographerAIGalleryHighlights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PhotographerAIGalleryHighlightsInputSchema = z.object({
  eventDescription: z
    .string()
    .describe('A brief description of the event to provide context for image selection.'),
  imageUris: z
    .array(
      z
        .string()
        .describe(
          "A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        )
    )
    .describe('An array of image data URIs from the gallery.'),
  numberOfHighlights: z
    .number()
    .int()
    .min(1)
    .default(5)
    .describe('The desired number of highlight images to suggest.'),
});
export type PhotographerAIGalleryHighlightsInput = z.infer<
  typeof PhotographerAIGalleryHighlightsInputSchema
>;

const PhotographerAIGalleryHighlightsOutputSchema = z.object({
  highlightedImages: z
    .array(
      z.object({
        imageUrl: z
          .string()
          .describe(
            "The data URI of the highlighted image. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
          ),
        reason: z.string().describe('A brief explanation for why this image was selected as a highlight.'),
      })
    )
    .describe('An array of selected highlight images and reasons for their selection.'),
});
export type PhotographerAIGalleryHighlightsOutput = z.infer<
  typeof PhotographerAIGalleryHighlightsOutputSchema
>;

export async function photographerAIGalleryHighlights(
  input: PhotographerAIGalleryHighlightsInput
): Promise<PhotographerAIGalleryHighlightsOutput> {
  return photographerAIGalleryHighlightsFlow(input);
}

const highlightTextPrompt = ai.definePrompt({
  name: 'photographerAIGalleryHighlightsTextPrompt',
  input: {schema: PhotographerAIGalleryHighlightsInputSchema},
  output: {schema: PhotographerAIGalleryHighlightsOutputSchema},
  prompt: `You are an expert wedding photographer's assistant specializing in curating highlight reels. Your task is to review a collection of images from an event and select the most visually impactful and representative photos for a highlight reel.

Consider the following criteria for selection:
-   **Emotional Impact**: Does the photo evoke strong emotions (joy, love, tenderness)?
-   **Composition**: Is the framing strong, balanced, and aesthetically pleasing?
-   **Lighting**: Is the lighting exceptional and does it enhance the subject?
-   **Storytelling**: Does the photo tell a part of the event's story effectively?
-   **Uniqueness**: Is the photo distinct from others and not redundant?
-   **Clarity**: Is the subject in focus and clear?

The event is described as: {{{eventDescription}}}

From the provided images, please select the top {{{numberOfHighlights}}} images that best fit these criteria. For each selected image, provide the 'imageUrl' (the exact data URI provided in the prompt) and a brief 'reason' for its selection.

Provide the response in JSON format.
`,
});

const photographerAIGalleryHighlightsFlow = ai.defineFlow(
  {
    name: 'photographerAIGalleryHighlightsFlow',
    inputSchema: PhotographerAIGalleryHighlightsInputSchema,
    outputSchema: PhotographerAIGalleryHighlightsOutputSchema,
  },
  async input => {
    // Generate the text part of the prompt using the defined prompt template.
    const textPromptPart = await highlightTextPrompt(input);

    // Construct the full prompt array, including the text and all image media parts.
    const fullPrompt = [
      { text: textPromptPart.output! }, // Use the rendered text from the prompt template
      ...input.imageUris.map(uri => ({
        media: { url: uri },
      })),
    ];

    const {output} = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image', // Using a multi-modal model for image understanding
      prompt: fullPrompt,
      config: {
        responseMimeType: 'application/json', // Request JSON output
      },
    });

    if (!output) {
      throw new Error('AI model did not return any output.');
    }

    // The output should be a JSON string, which needs to be parsed.
    const parsedOutput = JSON.parse(output.text) as PhotographerAIGalleryHighlightsOutput;
    return parsedOutput;
  }
);
