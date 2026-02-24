using Amazon.S3;
using Amazon.S3.Model;
using Amazon.Runtime;
using CafeUygulamasi.Models.Settings;
using Microsoft.Extensions.Options;
using System.Security.Authentication;

namespace CafeUygulamasi.Services
{
	public class CloudflareR2StorageService
	{
		private readonly CloudflareR2Options _options;
		private readonly AmazonS3Client _s3Client;

		public CloudflareR2StorageService(IOptions<CloudflareR2Options> options)
		{
			_options = options.Value;
			ValidateOptions(_options);
			var serviceUrl = ResolveServiceUrl(_options);

			var config = new AmazonS3Config
			{
				ServiceURL = serviceUrl,
				AuthenticationRegion = "auto",
				ForcePathStyle = true,
				// R2 does not implement optional SDK checksum features for all S3 flows.
				// Keep checksum behavior to "required only" for S3-compatible compatibility.
				RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
				ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED
			};

			_s3Client = new AmazonS3Client(_options.AccessKeyId, _options.SecretAccessKey, config);
		}

		public async Task<CloudflareR2UploadResult> UploadImageAsync(IFormFile file, string extension, CancellationToken cancellationToken = default)
		{
			var objectPrefix = _options.ObjectPrefix.Trim('/');
			var key = string.IsNullOrWhiteSpace(objectPrefix)
				? $"{Guid.NewGuid():N}{extension}"
				: $"{objectPrefix}/{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid():N}{extension}";

			await using var stream = file.OpenReadStream();
			var request = new PutObjectRequest
			{
				BucketName = _options.BucketName,
				Key = key,
				InputStream = stream,
				ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
				// Some S3-compatible providers (including R2 on some SDK versions)
				// can reject advanced streaming/signing features with 501 NotImplemented.
				UseChunkEncoding = false,
				DisablePayloadSigning = true,
				DisableDefaultChecksumValidation = true
			};

			try
			{
				await _s3Client.PutObjectAsync(request, cancellationToken);
			}
			catch (AmazonS3Exception ex)
			{
				throw new InvalidOperationException(BuildS3ErrorMessage(ex), ex);
			}
			catch (Exception ex) when (IsSslConnectionError(ex))
			{
				throw new InvalidOperationException(
					"Cloudflare R2 SSL baglantisi kurulamadi. CloudflareR2:Endpoint veya CloudflareR2:AccountId degerini kontrol edin. Ornek endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com",
					ex);
			}

			var baseUrl = _options.PublicBaseUrl.TrimEnd('/');
			var url = $"{baseUrl}/{key}";

			return new CloudflareR2UploadResult
			{
				FileName = Path.GetFileName(key),
				Key = key,
				Url = url
			};
		}

		private static void ValidateOptions(CloudflareR2Options options)
		{
			if (string.IsNullOrWhiteSpace(options.AccountId) && string.IsNullOrWhiteSpace(options.Endpoint))
				throw new InvalidOperationException("CloudflareR2:AccountId or CloudflareR2:Endpoint is required.");
			if (string.IsNullOrWhiteSpace(options.BucketName))
				throw new InvalidOperationException("CloudflareR2:BucketName is required.");
			if (string.IsNullOrWhiteSpace(options.AccessKeyId))
				throw new InvalidOperationException("CloudflareR2:AccessKeyId is required.");
			if (string.IsNullOrWhiteSpace(options.SecretAccessKey))
				throw new InvalidOperationException("CloudflareR2:SecretAccessKey is required.");
			if (string.IsNullOrWhiteSpace(options.PublicBaseUrl))
				throw new InvalidOperationException("CloudflareR2:PublicBaseUrl is required.");
			if (IsPlaceholder(options.AccountId))
				throw new InvalidOperationException("CloudflareR2:AccountId still contains template value.");
			if (IsPlaceholder(options.Endpoint))
				throw new InvalidOperationException("CloudflareR2:Endpoint still contains template value.");
			if (IsPlaceholder(options.BucketName))
				throw new InvalidOperationException("CloudflareR2:BucketName still contains template value.");
			if (IsPlaceholder(options.AccessKeyId))
				throw new InvalidOperationException("CloudflareR2:AccessKeyId still contains template value.");
			if (IsPlaceholder(options.SecretAccessKey))
				throw new InvalidOperationException("CloudflareR2:SecretAccessKey still contains template value.");
			if (IsPlaceholder(options.PublicBaseUrl))
				throw new InvalidOperationException("CloudflareR2:PublicBaseUrl still contains template value.");
		}

		private static string ResolveServiceUrl(CloudflareR2Options options)
		{
			var endpoint = (options.Endpoint ?? string.Empty).Trim();
			if (!string.IsNullOrWhiteSpace(endpoint))
				return NormalizeEndpoint(endpoint, "CloudflareR2:Endpoint");

			var accountId = (options.AccountId ?? string.Empty).Trim();

			if (Uri.TryCreate(accountId, UriKind.Absolute, out var accountUri))
				return NormalizeEndpoint(accountUri.GetLeftPart(UriPartial.Authority), "CloudflareR2:AccountId");

			if (accountId.Contains(".r2.cloudflarestorage.com", StringComparison.OrdinalIgnoreCase))
				return NormalizeEndpoint(accountId, "CloudflareR2:AccountId");

			return $"https://{accountId}.r2.cloudflarestorage.com";
		}

		private static string NormalizeEndpoint(string endpoint, string settingName)
		{
			var candidate = endpoint.Trim();
			if (!candidate.StartsWith("https://", StringComparison.OrdinalIgnoreCase) &&
				!candidate.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
			{
				candidate = $"https://{candidate}";
			}

			if (!Uri.TryCreate(candidate, UriKind.Absolute, out var uri) || string.IsNullOrWhiteSpace(uri.Host))
				throw new InvalidOperationException($"{settingName} is invalid.");

			if (!uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
				throw new InvalidOperationException($"{settingName} must use https.");

			var portSuffix = uri.IsDefaultPort ? string.Empty : $":{uri.Port}";
			return $"{uri.Scheme}://{uri.Host}{portSuffix}";
		}

		private static bool IsSslConnectionError(Exception exception)
		{
			var current = exception;
			while (current is not null)
			{
				if (current is AuthenticationException)
					return true;

				if (current.Message.Contains("SSL", StringComparison.OrdinalIgnoreCase))
					return true;

				current = current.InnerException;
			}

			return false;
		}

		private static bool IsPlaceholder(string? value)
		{
			if (string.IsNullOrWhiteSpace(value))
				return false;

			return value.Contains("YOUR_", StringComparison.OrdinalIgnoreCase) ||
				   value.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase);
		}

		private static string BuildS3ErrorMessage(AmazonS3Exception ex)
		{
			var errorCode = ex.ErrorCode ?? string.Empty;
			if (errorCode.Equals("InvalidAccessKeyId", StringComparison.OrdinalIgnoreCase))
				return "Cloudflare R2 AccessKeyId gecersiz. CloudflareR2:AccessKeyId degerini kontrol edin.";

			if (errorCode.Equals("SignatureDoesNotMatch", StringComparison.OrdinalIgnoreCase))
				return "Cloudflare R2 imza dogrulamasi basarisiz. CloudflareR2:SecretAccessKey veya AccountId/Endpoint ayarlarini kontrol edin.";

			if (errorCode.Equals("AccessDenied", StringComparison.OrdinalIgnoreCase))
				return "Cloudflare R2 erisim reddedildi. API anahtarinin bucket icin yazma izni oldugundan emin olun.";

			if (errorCode.Equals("NoSuchBucket", StringComparison.OrdinalIgnoreCase))
				return "Cloudflare R2 bucket bulunamadi. CloudflareR2:BucketName degerini kontrol edin.";

			if (errorCode.Equals("NotImplemented", StringComparison.OrdinalIgnoreCase))
				return "Cloudflare R2, gonderilen S3 ozelligini desteklemiyor (genelde checksum/header kaynakli).";

			return $"Cloudflare R2 upload basarisiz. ErrorCode: {errorCode}, StatusCode: {(int)ex.StatusCode}.";
		}
	}

	public class CloudflareR2UploadResult
	{
		public string FileName { get; set; } = string.Empty;
		public string Key { get; set; } = string.Empty;
		public string Url { get; set; } = string.Empty;
	}
}
