using Microsoft.AspNetCore.Mvc;
using CafeUygulamasi.Services;
using Amazon.S3;

namespace CafeUygulamasi.Controllers
{
	[ApiController]
	[Route("api/v1/uploads")]
	public class UploadController : Controller
	{
		private static readonly string[] DefaultAllowedImageExtensions =
		[
			".jpg",
			".jpeg",
			".png",
			".webp",
			".gif"
		];

		private readonly IConfiguration _configuration;
		private readonly CloudflareR2StorageService _r2StorageService;
		private readonly ILogger<UploadController> _logger;

		public UploadController(IConfiguration configuration, CloudflareR2StorageService r2StorageService, ILogger<UploadController> logger)
		{
			_configuration = configuration;
			_r2StorageService = r2StorageService;
			_logger = logger;
		}

		[HttpPost("image")]
		[Consumes("multipart/form-data")]
		public async Task<IActionResult> UploadImage([FromForm] IFormFile file)
		{
			if (file is null || file.Length == 0)
				return BadRequest(new { success = false, message = "Image file is required." });

			var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
			var allowedExtensions = _configuration.GetSection("FileUpload:AllowedImageExtensions").Get<string[]>();
			allowedExtensions ??= DefaultAllowedImageExtensions;

			if (!allowedExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
				return BadRequest(new
				{
					success = false,
					message = $"Invalid image format. Allowed: {string.Join(", ", allowedExtensions)}"
				});

			var imageMaxSizeMb = _configuration.GetValue<int?>("FileUpload:ImageMaxSizeMb") ?? 5;
			var maxSizeInBytes = imageMaxSizeMb * 1024L * 1024L;
			if (file.Length > maxSizeInBytes)
				return BadRequest(new
				{
					success = false,
					message = $"Image size cannot exceed {imageMaxSizeMb} MB."
				});

			CloudflareR2UploadResult uploadResult;
			try
			{
				uploadResult = await _r2StorageService.UploadImageAsync(file, extension, HttpContext.RequestAborted);
			}
			catch (InvalidOperationException ex)
			{
				_logger.LogWarning(ex, "Image upload validation/storage configuration error.");
				return StatusCode(StatusCodes.Status500InternalServerError, new
				{
					success = false,
					message = ex.Message
				});
			}
			catch (AmazonS3Exception ex)
			{
				_logger.LogError(ex, "Cloudflare R2 upload failed. Code: {ErrorCode}, Status: {StatusCode}, RequestId: {RequestId}", ex.ErrorCode, ex.StatusCode, ex.RequestId);
				return StatusCode(StatusCodes.Status500InternalServerError, new
				{
					success = false,
					message = "Cloudflare R2 upload request failed. Check R2 credentials, bucket name, and permissions."
				});
			}
			catch (Exception)
			{
				_logger.LogError("Image upload failed with unexpected error.");
				return StatusCode(StatusCodes.Status500InternalServerError, new
				{
					success = false,
					message = "Image upload failed."
				});
			}

			return Ok(new
			{
				success = true,
				data = new
				{
					fileName = uploadResult.FileName,
					key = uploadResult.Key,
					url = uploadResult.Url
				}
			});
		}
	}
}
