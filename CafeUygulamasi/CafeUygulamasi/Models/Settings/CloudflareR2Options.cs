namespace CafeUygulamasi.Models.Settings
{
	public class CloudflareR2Options
	{
		public string AccountId { get; set; } = string.Empty;
		public string Endpoint { get; set; } = string.Empty;
		public string BucketName { get; set; } = string.Empty;
		public string AccessKeyId { get; set; } = string.Empty;
		public string SecretAccessKey { get; set; } = string.Empty;
		public string PublicBaseUrl { get; set; } = string.Empty;
		public string ObjectPrefix { get; set; } = "images";
	}
}
