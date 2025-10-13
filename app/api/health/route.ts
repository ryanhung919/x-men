import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Health check endpoint
 * Used by CI/CD to verify the application and database are ready
 */
export async function GET() {
  try {
    // Check if database is accessible
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('departments')
      .select('id')
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          error: 'Database connection failed',
          details: error.message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    );
  }
}