import { NextRequest, NextResponse } from 'next/server';

interface FeedbackData {
  feature: 'calibration' | 'hud' | 'general';
  rating: number;
  comments: string;
  userAgent: string;
  timestamp: number;
  sessionId: string;
}

export async function POST(request: NextRequest) {
  try {
    const feedback: FeedbackData = await request.json();

    // Validate the feedback data
    if (!feedback.feature || !feedback.rating || feedback.rating < 1 || feedback.rating > 5) {
      return NextResponse.json(
        { error: 'Invalid feedback data' },
        { status: 400 }
      );
    }

    // Log the feedback (in production, you'd save this to a database)
    console.log('Feedback received:', {
      feature: feedback.feature,
      rating: feedback.rating,
      hasComments: feedback.comments.length > 0,
      timestamp: new Date(feedback.timestamp).toISOString(),
      sessionId: feedback.sessionId,
    });

    // In a real implementation, you would:
    // 1. Save to database
    // 2. Send to analytics service
    // 3. Trigger alerts for low ratings
    // 4. Store user agent for device analysis

    // For now, just return success
    return NextResponse.json(
      { message: 'Feedback received successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing feedback:', error);
    return NextResponse.json(
      { error: 'Failed to process feedback' },
      { status: 500 }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
