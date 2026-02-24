using CafeUygulamasi.Models;

namespace CafeUygulamasi.Models.Dto
{
	public class DtoBranchCreate
	{
		public string Name { get; set; }
		public string ImageUrl { get; set; }
		public string City { get; set; }
		public string District { get; set; }
		public bool IsOpen { get; set; }
		public BranchLocation? Location { get; set; }
		public List<BranchWorkingHour>? WorkingHours { get; set; }
		public BranchOrderLinks? OrderLinks { get; set; }
	}
}
