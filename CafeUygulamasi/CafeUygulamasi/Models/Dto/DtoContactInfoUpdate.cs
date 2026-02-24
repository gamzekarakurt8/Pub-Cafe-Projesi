using CafeUygulamasi.Models;

namespace CafeUygulamasi.Models.Dto
{
	public class DtoContactInfoUpdate
	{
		public string Phone { get; set; }
		public string Email { get; set; }
		public ContactSocial? Social { get; set; }
		public ContactOrderLinks? OrderLinks { get; set; }
	}
}
