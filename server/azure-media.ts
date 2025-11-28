import { BlobServiceClient, generateBlobSASQueryParameters, StorageSharedKeyCredential, BlobSASPermissions } from '@azure/storage-blob';
import { log } from './utils';
import { config } from './config';

// Azure Storage configuration from environment
const getStorageAccount = () => config.azureStorageAccount;
const getStorageKey = () => {
  if (!config.azureStorageKey) {
    throw new Error('Azure Storage key not configured');
  }
  return config.azureStorageKey;
};
const getStorageUrl = () => `https://${getStorageAccount()}.blob.core.windows.net`;

// Course video mapping
interface CourseVideo {
  containerName: string;
  shortVideoBlob: string;
  shortVideoDuration: number; // in seconds
  longVideoBlob: string;
  longVideoContainer: string;
  longVideoDuration?: number; // in seconds (optional)
  poster: string;
}

const COURSE_VIDEOS: Record<string, CourseVideo> = {
  'bolt-new': {
    containerName: 'bolt-new-shortvideo',
    shortVideoBlob: 'Bolt-new short video.mp4',
    shortVideoDuration: 30, // 30-second preview
    longVideoBlob: 'Bolt-new-longvideo-faststart.mp4',
    longVideoContainer: 'bolt-new-longvideo-faststart',
    longVideoDuration: 2700, // ~45 minutes (placeholder)
    poster: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  'v0-dev': {
    containerName: 'v0-dev-shortvideo',
    shortVideoBlob: 'v0-dev short video.mp4',
    shortVideoDuration: 30, // 30-second preview
    longVideoBlob: 'v0-dev-longvideo-faststart.mp4',
    longVideoContainer: 'v0-dev-longvideo-faststart',
    longVideoDuration: 2700, // ~45 minutes (placeholder)
    poster: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  }
};

/**
 * Generate a SAS URL for a blob with read-only access
 * @param containerName - The container name
 * @param blobName - The blob name
 * @param expiryHours - How many hours the URL should be valid (default: 4)
 */
export async function generateVideoSasUrl(
  containerName: string,
  blobName: string,
  expiryHours: number = 1 // Default to 1 hour for security
): Promise<string> {
  try {
    const storageAccount = getStorageAccount();
    const storageKey = getStorageKey();
    const storageUrl = getStorageUrl();
    
    const sharedKeyCredential = new StorageSharedKeyCredential(storageAccount, storageKey);
    
    // Set permissions (read only)
    const permissions = new BlobSASPermissions();
    permissions.read = true;
    
    // Set expiry time
    const startsOn = new Date();
    const expiresOn = new Date(startsOn);
    expiresOn.setHours(expiresOn.getHours() + expiryHours);
    
    // Generate SAS token
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions,
        startsOn,
        expiresOn,
      },
      sharedKeyCredential
    ).toString();
    
    // Construct full URL
    const sasUrl = `${storageUrl}/${containerName}/${encodeURIComponent(blobName)}?${sasToken}`;
    
    log(`Generated SAS URL for ${containerName}/${blobName} (expires in ${expiryHours}h)`, 'azure-media');
    
    return sasUrl;
  } catch (error) {
    log(`Error generating SAS URL: ${error}`, 'azure-media-ERROR');
    throw new Error('Failed to generate secure video URL');
  }
}

/**
 * Get secure video URLs for a course
 * @param courseId - The course identifier (e.g., 'bolt-new', 'v0-dev')
 */
export async function getCourseVideoUrls(courseId: string): Promise<{
  shortVideoUrl: string;
  longVideoUrl: string;
  poster: string;
}> {
  const courseVideo = COURSE_VIDEOS[courseId];
  
  if (!courseVideo) {
    throw new Error(`Course ${courseId} not found`);
  }
  
  // For short video
  const shortVideoUrl = await generateVideoSasUrl(
    courseVideo.containerName,
    courseVideo.shortVideoBlob
  );
  
  // For long video (different container)
  const longContainer = courseId === 'bolt-new' 
    ? 'bolt-new-longvideo-faststart' 
    : 'v0-dev-longvideo-faststart';
  
  const longBlobName = courseId === 'bolt-new'
    ? 'Bolt-new-longvideo-faststart.mp4'
    : 'v0-dev-longvideo-faststart.mp4';
  
  const longVideoUrl = await generateVideoSasUrl(
    longContainer,
    longBlobName
  );
  
  return {
    shortVideoUrl,
    longVideoUrl,
    poster: courseVideo.poster
  };
}

/**
 * Validate if a course exists
 */
export function isCourseValid(courseId: string): boolean {
  return courseId in COURSE_VIDEOS;
}

/**
 * Get list of available courses
 */
export function getAvailableCourses(): string[] {
  return Object.keys(COURSE_VIDEOS);
}

/**
 * Get video URLs with subscription gating
 * @param courseId - The course identifier
 * @param hasActiveSubscription - Whether the user has an active subscription
 */
export async function getCourseVideoUrlsWithGating(
  courseId: string,
  hasActiveSubscription: boolean
): Promise<{
  shortVideoUrl: string;
  shortVideoDuration: number;
  longVideoUrl?: string;
  longVideoDuration?: number;
  poster: string;
  hasAccess: boolean;
}> {
  const courseVideo = COURSE_VIDEOS[courseId];

  if (!courseVideo) {
    throw new Error(`Course ${courseId} not found`);
  }

  // Always provide short video (promo)
  const shortVideoUrl = await generateVideoSasUrl(
    courseVideo.containerName,
    courseVideo.shortVideoBlob,
    4 // 4 hours expiry - longer for better user experience
  );

  // Only provide long video if user has active subscription
  let longVideoUrl: string | undefined;
  if (hasActiveSubscription) {
    longVideoUrl = await generateVideoSasUrl(
      courseVideo.longVideoContainer,
      courseVideo.longVideoBlob,
      4 // 4 hours expiry - enough for full course viewing
    );
  }

  return {
    shortVideoUrl,
    shortVideoDuration: courseVideo.shortVideoDuration,
    longVideoUrl,
    longVideoDuration: courseVideo.longVideoDuration,
    poster: courseVideo.poster,
    hasAccess: hasActiveSubscription
  };
}

/**
 * Verify and secure all video containers
 * Checks that containers are private and sets them to private if they're not
 * This function should be called on server startup
 */
export async function verifyAndSecureContainers(): Promise<void> {
  try {
    const storageAccount = getStorageAccount();
    const storageKey = getStorageKey();

    log('Starting Azure container security verification...', 'azure-media');

    const sharedKeyCredential = new StorageSharedKeyCredential(storageAccount, storageKey);
    const blobServiceClient = new BlobServiceClient(
      getStorageUrl(),
      sharedKeyCredential
    );

    // Collect all unique container names from COURSE_VIDEOS
    const containerNames = new Set<string>();
    Object.values(COURSE_VIDEOS).forEach(course => {
      containerNames.add(course.containerName);
      containerNames.add(course.longVideoContainer);
    });

    log(`Checking ${containerNames.size} containers: ${Array.from(containerNames).join(', ')}`, 'azure-media');

    let allSecure = true;
    const results: string[] = [];

    for (const containerName of containerNames) {
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Check if container exists
        const exists = await containerClient.exists();
        if (!exists) {
          log(`⚠️  Container '${containerName}' does not exist!`, 'azure-media-WARN');
          results.push(`❌ ${containerName}: NOT FOUND`);
          allSecure = false;
          continue;
        }

        // Get current access level
        const properties = await containerClient.getProperties();
        const publicAccess = properties.blobPublicAccess;

        if (publicAccess && publicAccess !== 'off') {
          // Container is public - attempt to make it private
          log(`⚠️  Container '${containerName}' is PUBLIC (${publicAccess}). Setting to private...`, 'azure-media-WARN');

          try {
            await containerClient.setAccessPolicy('container');
            log(`✅ Container '${containerName}' has been secured (set to private)`, 'azure-media');
            results.push(`✅ ${containerName}: SECURED (was ${publicAccess})`);
          } catch (error) {
            log(`❌ Failed to secure container '${containerName}': ${error}`, 'azure-media-ERROR');
            results.push(`❌ ${containerName}: FAILED TO SECURE`);
            allSecure = false;
          }
        } else {
          // Container is already private
          log(`✅ Container '${containerName}' is properly secured (private)`, 'azure-media');
          results.push(`✅ ${containerName}: SECURE`);
        }
      } catch (error) {
        log(`❌ Error checking container '${containerName}': ${error}`, 'azure-media-ERROR');
        results.push(`❌ ${containerName}: ERROR - ${error}`);
        allSecure = false;
      }
    }

    // Log final summary
    log('\n=== Azure Container Security Verification Complete ===', 'azure-media');
    results.forEach(result => log(result, 'azure-media'));
    log('=====================================================\n', 'azure-media');

    if (!allSecure) {
      throw new Error('Some Azure containers are not properly secured. Please check the logs above.');
    }

    log('All video containers are properly secured ✓', 'azure-media');
  } catch (error) {
    log(`Critical error during container security verification: ${error}`, 'azure-media-ERROR');
    throw error;
  }
}

/**
 * Generate SAS URL for course resource (PDF, etc.)
 * Requires subscription check before calling this
 */
export async function getCourseResourceUrl(
  courseId: string,
  resourceType: 'manual' | 'workbook'
): Promise<string> {
  const resourceMap: Record<string, Record<string, string>> = {
    'bolt-new': {
      'manual': 'Bolt_New_Reference_Manual.pdf'
    },
    'v0-dev': {
      'manual': 'v0_dev_Reference_Manual.pdf'
    }
  };

  const blobName = resourceMap[courseId]?.[resourceType];
  if (!blobName) {
    throw new Error(`Resource not found for course ${courseId} type ${resourceType}`);
  }

  // Generate SAS URL for resource (4 hours expiry)
  return await generateVideoSasUrl('course-resources', blobName, 4);
}

